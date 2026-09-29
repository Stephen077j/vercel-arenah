import { Router, Request, Response } from 'express';
import { query, queryOne, execute, generateId } from '../db/database.js';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { createNotification }      from './notifications.js';
import { awardPoints }             from './loyalty.js';
import { sendPushToUser }          from './push.js';
import { fireWebhook }             from './webhooks.js';
import { sendPaymentConfirmed }    from '../services/email.js';
import { smsPaymentConfirmed }     from '../services/sms.js';
import {
  initiateMvola,
  initiateOrange,
  initiateAirtel,
} from '../services/mobileMoney.js';

const router = Router();

// Frais de transaction mobile money : 3 %
const FEE_RATE = parseFloat(process.env.PAYMENT_FEE_PERCENT || '3') / 100;

// URL de base de l'API (pour les webhooks)
function apiBase() {
  return process.env.API_BASE_URL || 'http://localhost:3001';
}
function frontBase() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function makeRef() {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ARN-${ts}-${rnd}`;
}

function isMobile(method: string) {
  return ['mvola', 'orange', 'airtel'].includes(method);
}

// ─── Initier un paiement ──────────────────────────────────────────────────
router.post('/initiate', requireAuth, async (req: AuthRequest, res: Response) => {
  const { amount, method, booking_type, booking_id, customer_phone, notes } = req.body;

  if (!amount || !method || !booking_type || !booking_id) {
    res.status(400).json({ error: 'amount, method, booking_type et booking_id requis' });
    return;
  }

  // Frais 3 % sur mobile money uniquement
  const fee         = isMobile(method) ? Math.ceil(amount * FEE_RATE) : 0;
  const totalAmount = amount + fee;

  const ref    = makeRef();
  const id     = generateId();
  const status = method === 'especes' ? 'pending_cash' : 'pending';

  await execute(
    `INSERT INTO payments (id, user_id, reference, amount, fee, method, status, booking_type, booking_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, req.user!.id, ref, totalAmount, fee, method, status, booking_type, booking_id, notes || null]
  );

  let instructions: Record<string, string> | null = null;
  let paymentUrl: string | undefined;
  let apiMode = false;

  // ── Appel API réel si credentials configurés ──────────────────────────
  if (method === 'mvola') {
    try {
      const r = await initiateMvola({
        amount: totalAmount,
        reference: ref,
        customerPhone: customer_phone || '',
        callbackUrl: `${apiBase()}/api/payments/webhook/mvola`,
      });
      if (r.mode === 'api') {
        apiMode = true;
        await execute('UPDATE payments SET server_ref = $1 WHERE id = $2', [r.serverRef, id]);
      }
    } catch (e) {
      console.error('[MVola]', e);
    }
    const merchant = process.env.MVOLA_MERCHANT_NUMBER || '034 xx xx xx';
    instructions = {
      numero: merchant,
      texte:  `Envoyez ${totalAmount.toLocaleString('fr-FR')} Ar au ${merchant} (dont ${fee.toLocaleString('fr-FR')} Ar de frais)`,
      etapes: apiMode
        ? `Une invite USSD va apparaître sur votre téléphone.\n1. Confirmez la transaction MVola\n2. Montant : ${totalAmount.toLocaleString('fr-FR')} Ar\n3. Référence : ${ref}`
        : `1. Ouvrez MVola\n2. Envoi d'argent → ${merchant}\n3. Montant : ${totalAmount.toLocaleString('fr-FR')} Ar\n4. Note/référence : ${ref}\n\n(inclut ${fee.toLocaleString('fr-FR')} Ar de frais — 3 %)`,
    };

  } else if (method === 'orange') {
    try {
      const r = await initiateOrange({
        amount: totalAmount,
        reference: ref,
        callbackUrl: `${apiBase()}/api/payments/webhook/orange`,
        returnUrl:   `${frontBase()}/paiement/retour?ref=${ref}`,
      });
      if (r.mode === 'api') {
        apiMode = true;
        paymentUrl = r.paymentUrl;
        await execute('UPDATE payments SET server_ref = $1 WHERE id = $2', [r.serverRef, id]);
      }
    } catch (e) {
      console.error('[Orange]', e);
    }
    const merchant = process.env.ORANGE_MERCHANT_NUMBER || '032 xx xx xx';
    instructions = {
      numero: merchant,
      texte:  apiMode
        ? `Cliquez sur le bouton ci-dessous pour payer ${totalAmount.toLocaleString('fr-FR')} Ar via Orange Money`
        : `Envoyez ${totalAmount.toLocaleString('fr-FR')} Ar au ${merchant}`,
      etapes: apiMode
        ? `Vous allez être redirigé vers la page de paiement Orange Money sécurisée.\nMontant : ${totalAmount.toLocaleString('fr-FR')} Ar (dont ${fee.toLocaleString('fr-FR')} Ar de frais)`
        : `1. Composez #144#\n2. Transfert → ${merchant}\n3. Montant : ${totalAmount.toLocaleString('fr-FR')} Ar\n4. Note : ${ref}\n\n(inclut ${fee.toLocaleString('fr-FR')} Ar de frais — 3 %)`,
    };

  } else if (method === 'airtel') {
    try {
      const r = await initiateAirtel({
        amount: totalAmount,
        reference: ref,
        customerPhone: customer_phone || '',
      });
      if (r.mode === 'api') {
        apiMode = true;
        await execute('UPDATE payments SET server_ref = $1 WHERE id = $2', [r.serverRef, id]);
      }
    } catch (e) {
      console.error('[Airtel]', e);
    }
    const merchant = process.env.AIRTEL_MERCHANT_NUMBER || '033 xx xx xx';
    instructions = {
      numero: merchant,
      texte:  `Envoyez ${totalAmount.toLocaleString('fr-FR')} Ar au ${merchant} (dont ${fee.toLocaleString('fr-FR')} Ar de frais)`,
      etapes: apiMode
        ? `Une invite USSD va apparaître sur votre téléphone.\n1. Confirmez la transaction Airtel Money\n2. Montant : ${totalAmount.toLocaleString('fr-FR')} Ar\n3. Référence : ${ref}`
        : `1. Ouvrez Airtel Money\n2. Paiement marchand → ${merchant}\n3. Montant : ${totalAmount.toLocaleString('fr-FR')} Ar\n4. Référence : ${ref}\n\n(inclut ${fee.toLocaleString('fr-FR')} Ar de frais — 3 %)`,
    };
  }

  await createNotification(
    req.user!.id,
    method === 'especes' ? '💵 Paiement en attente caisse' : `Paiement ${method} initié`,
    method === 'especes'
      ? `Réglez ${totalAmount.toLocaleString('fr-FR')} Ar à la caisse. Réf : ${ref}`
      : `Réf : ${ref} — ${totalAmount.toLocaleString('fr-FR')} Ar${fee > 0 ? ` (dont ${fee.toLocaleString('fr-FR')} Ar de frais)` : ''}`,
    'payment'
  );

  res.status(201).json({
    id,
    reference: ref,
    status,
    fee,
    total: totalAmount,
    instructions,
    payment_url: paymentUrl ?? null,
  });
});

// ─── Webhooks opérateurs ──────────────────────────────────────────────────

// MVola callback: { serverCorrelationId, status: "Completed"|"Failed", transactionReference }
router.post('/webhook/mvola', async (req: Request, res: Response) => {
  res.sendStatus(200);
  try {
    const { serverCorrelationId, status, transactionReference } = req.body;
    const p = await queryOne<{ id: string; user_id: string; amount: number; reference: string }>(
      'SELECT id, user_id, amount, reference FROM payments WHERE server_ref = $1',
      [serverCorrelationId]
    );
    if (!p) return;

    if (status === 'Completed') {
      await confirmPaymentById(p.id, p.user_id, p.amount, p.reference, transactionReference);
    } else if (status === 'Failed') {
      await rejectPaymentById(p.id, p.user_id, p.amount, p.reference);
    }
  } catch (e) {
    console.error('[Webhook MVola]', e);
  }
});

// Orange Money callback: { notif_token, status: "SUCCESS"|"FAILED", order_id }
router.post('/webhook/orange', async (req: Request, res: Response) => {
  res.sendStatus(200);
  try {
    const { status, order_id } = req.body;
    const p = await queryOne<{ id: string; user_id: string; amount: number; reference: string }>(
      'SELECT id, user_id, amount, reference FROM payments WHERE reference = $1',
      [order_id]
    );
    if (!p) return;

    if (status === 'SUCCESS') {
      await confirmPaymentById(p.id, p.user_id, p.amount, p.reference, order_id);
    } else if (status === 'FAILED') {
      await rejectPaymentById(p.id, p.user_id, p.amount, p.reference);
    }
  } catch (e) {
    console.error('[Webhook Orange]', e);
  }
});

// Airtel Money callback: { transaction: { id, status_code: "TS", ... } }
router.post('/webhook/airtel', async (req: Request, res: Response) => {
  res.sendStatus(200);
  try {
    const txn = req.body?.transaction ?? req.body;
    const ref  = txn.id || txn.reference;
    const code = txn.status_code || txn.status;
    const p = await queryOne<{ id: string; user_id: string; amount: number; reference: string }>(
      'SELECT id, user_id, amount, reference FROM payments WHERE reference = $1 OR server_ref = $1',
      [ref]
    );
    if (!p) return;

    if (code === 'TS' || code === 'SUCCESS' || code === 'Completed') {
      await confirmPaymentById(p.id, p.user_id, p.amount, p.reference, ref);
    } else if (code === 'TF' || code === 'FAILED') {
      await rejectPaymentById(p.id, p.user_id, p.amount, p.reference);
    }
  } catch (e) {
    console.error('[Webhook Airtel]', e);
  }
});

// ─── Helpers internes ─────────────────────────────────────────────────────
async function confirmPaymentById(
  id: string, userId: string, amount: number, reference: string, txnRef?: string
) {
  const p = await queryOne<{
    status: string; booking_type: string; booking_id: string;
  }>('SELECT status, booking_type, booking_id FROM payments WHERE id = $1', [id]);
  if (!p || p.status === 'success') return;

  await execute(
    `UPDATE payments SET status = 'success', transaction_ref = $1, paid_at = NOW() WHERE id = $2`,
    [txnRef || null, id]
  );
  await markBookingPaid(p.booking_type, p.booking_id);
  await awardPoints(userId, amount, reference);
  await createNotification(
    userId,
    '✅ Paiement confirmé',
    `Votre paiement de ${amount.toLocaleString('fr-FR')} Ar (réf. ${reference}) a été validé.`,
    'success'
  );
  await sendPushToUser(userId, '✅ Paiement confirmé', `${amount.toLocaleString('fr-FR')} Ar validé — Réf. ${reference}`, undefined, '/mes-paiements').catch(() => {});
  await fireWebhook('payment.confirmed', { user_id: userId, reference, amount, booking_type: p.booking_type, booking_id: p.booking_id, transaction_ref: txnRef }).catch(() => {});
  // Email + SMS confirmation paiement
  const u = await queryOne<{ email: string; fullname: string; phone: string }>(
    'SELECT email, fullname, phone FROM users WHERE id = $1', [userId]
  ).catch(() => null);
  if (u) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const TYPE_LABELS: Record<string,string> = { order:'Boutique', hotel:'Hôtel', gym:'Gym', salon:'Salon', field:'Terrain', pool:'Piscine', event:'Événement', show:'Spectacle', cybercafe:'Cybercafé' };
    sendPaymentConfirmed({
      to: u.email, fullname: u.fullname, reference, amount,
      method: p.booking_type, service: TYPE_LABELS[p.booking_type] ?? p.booking_type,
      receiptUrl: `${frontendUrl}/mes-paiements/${id}/facture`,
    }).catch(() => {});
    if (u.phone) smsPaymentConfirmed(u.phone, reference, amount).catch(() => {});
  }
}

async function rejectPaymentById(
  id: string, userId: string, amount: number, reference: string
) {
  await execute("UPDATE payments SET status = 'failed' WHERE id = $1", [id]);
  await createNotification(
    userId,
    '❌ Paiement non reçu',
    `Le paiement de ${amount.toLocaleString('fr-FR')} Ar (réf. ${reference}) n'a pas pu être validé.`,
    'error'
  );
}

async function markBookingPaid(type: string, bookingId: string) {
  const tableMap: Record<string, string> = {
    order:        'orders',
    hotel:        'hotel_bookings',
    gym:          'gym_subscriptions',
    gym_coach:    'gym_coach_bookings',
    salon:        'salon_bookings',
    field:        'field_bookings',
    pool:         'pool_passes',
    pool_course:  'pool_course_bookings',
    show:         'show_bookings',
    cybercafe:    'cybercafe_bookings',
  };
  const field = type === 'event' ? 'deposit_paid' : 'paid';
  const table = type === 'event' ? 'event_bookings' : tableMap[type];
  if (table) await execute(`UPDATE ${table} SET ${field} = true WHERE id = $1`, [bookingId]);
}

// ─── Confirmation manuelle admin ──────────────────────────────────────────
router.post('/:id/confirm', requireAdmin, async (req: AuthRequest, res: Response) => {
  const p = await queryOne<{
    id: string; user_id: string; status: string; amount: number; reference: string;
  }>('SELECT * FROM payments WHERE id = $1', [req.params.id]);
  if (!p) { res.status(404).json({ error: 'Paiement introuvable' }); return; }
  if (p.status === 'success') { res.json({ already: true }); return; }
  await confirmPaymentById(p.id, p.user_id, p.amount, p.reference);
  res.json({ success: true });
});

// ─── Démo : confirmation instantanée (dev uniquement) ───────────────────
router.post('/:id/demo-confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Non disponible en production' });
    return;
  }
  const p = await queryOne<{ id: string; user_id: string; amount: number; reference: string }>(
    'SELECT id, user_id, amount, reference FROM payments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  if (!p) { res.status(404).json({ error: 'Paiement introuvable' }); return; }
  await confirmPaymentById(p.id, p.user_id, p.amount, p.reference, 'DEMO');
  res.json({ success: true });
});

// ─── Rejet admin ──────────────────────────────────────────────────────────
router.post('/:id/reject', requireAdmin, async (req: AuthRequest, res: Response) => {
  const p = await queryOne<{ user_id: string; amount: number; reference: string }>(
    'SELECT user_id, amount, reference FROM payments WHERE id = $1', [req.params.id]
  );
  if (!p) { res.status(404).json({ error: 'Paiement introuvable' }); return; }
  await rejectPaymentById(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, p.user_id, p.amount, p.reference);
  res.json({ success: true });
});

// ─── Statut polling client ────────────────────────────────────────────────
router.get('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const p = await queryOne<{
    status: string; reference: string; amount: number; method: string; fee: number;
  }>(
    'SELECT status, reference, amount, method, fee FROM payments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  if (!p) { res.status(404).json({ error: 'Introuvable' }); return; }
  res.json(p);
});

// ─── Historique client ────────────────────────────────────────────────────
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await query(
    'SELECT id, reference, amount, fee, method, status, booking_type, booking_id, paid_at, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user!.id]
  ));
});

// ─── Reçu / Facture client ────────────────────────────────────────────────
router.get('/:id/receipt', requireAuth, async (req: AuthRequest, res: Response) => {
  // Vérifier que le paiement appartient bien à ce client
  const p = await queryOne<{
    id: string; reference: string; amount: number; fee: number; method: string;
    status: string; booking_type: string; booking_id: string;
    transaction_ref: string | null; paid_at: string | null; created_at: string;
  }>(
    `SELECT id, reference, amount, fee, method, status, booking_type, booking_id,
            transaction_ref, paid_at, created_at
     FROM payments WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user!.id]
  );
  if (!p) { res.status(404).json({ error: 'Paiement introuvable' }); return; }

  // Infos du client
  const u = await queryOne<{ fullname: string; email: string; phone: string }>(
    'SELECT fullname, email, phone FROM users WHERE id = $1', [req.user!.id]
  );

  // Détail de la réservation selon le type
  let bookingDetail: Record<string, unknown> = {};
  try {
    const typeMap: Record<string, string> = {
      order:       `SELECT total as montant, mode, notes FROM orders WHERE id = $1`,
      hotel:       `SELECT check_in, check_out, room_id as detail FROM hotel_bookings WHERE id = $1`,
      gym:         `SELECT gp.label as detail FROM gym_subscriptions gs JOIN gym_plans gp ON gp.id = gs.plan_id WHERE gs.id = $1`,
      gym_coach:   `SELECT CONCAT(gc.name,' — ',gcb.date) as detail FROM gym_coach_bookings gcb JOIN gym_coaches gc ON gc.id = gcb.coach_id WHERE gcb.id = $1`,
      salon:       `SELECT CONCAT(ss.label,' — ',sb.date,' ',sb.slot) as detail FROM salon_bookings sb JOIN salon_services ss ON ss.id = sb.service_id WHERE sb.id = $1`,
      field:       `SELECT CONCAT(date,' ',slot_label) as detail FROM field_bookings WHERE id = $1`,
      pool:        `SELECT CONCAT(pt.label,' (',pp.entries_left,' entrées)') as detail FROM pool_passes pp JOIN pool_pass_types pt ON pt.id = pp.pass_type_id WHERE pp.id = $1`,
      pool_course: `SELECT CONCAT(course_name,' — ',date,' ',slot) as detail FROM pool_course_bookings WHERE id = $1`,
      event:       `SELECT CONCAT(eh.name,' — ',eb.event_date) as detail FROM event_bookings eb JOIN event_halls eh ON eh.id = eb.hall_id WHERE eb.id = $1`,
      show:        `SELECT CONCAT(s.title,' — ',sb.seats_count,' place(s)') as detail FROM show_bookings sb JOIN shows s ON s.id = sb.show_id WHERE sb.id = $1`,
      cybercafe:   `SELECT CONCAT('Poste ',cs.number,' — ',cd.label) as detail FROM cybercafe_bookings cb JOIN cybercafe_stations cs ON cs.id = cb.station_id JOIN cybercafe_durations cd ON cd.id = cb.duration_id WHERE cb.id = $1`,
    };
    const sql = typeMap[p.booking_type];
    if (sql) bookingDetail = (await queryOne(sql, [p.booking_id])) ?? {};
  } catch { /* pas bloquant */ }

  const METHOD_LABELS: Record<string, string> = {
    mvola:'MVola', orange:'Orange Money', airtel:'Airtel Money', especes:'Espèces', carte:'Carte bancaire',
  };
  const TYPE_LABELS: Record<string, string> = {
    order:'Boutique', restaurant:'Restaurant', hotel:'Hôtel', gym:'Gym', gym_coach:'Coach sportif',
    salon:'Salon beauté', field:'Terrain de sport', pool:'Piscine', pool_course:'Cours piscine',
    event:'Événement', show:'Spectacle', cybercafe:'Cybercafé',
  };

  res.json({
    payment: {
      ...p,
      method_label:  METHOD_LABELS[p.method] ?? p.method,
      booking_label: TYPE_LABELS[p.booking_type] ?? p.booking_type,
      total: p.amount + p.fee,
    },
    client: u,
    booking: bookingDetail,
    issued_at: new Date().toISOString(),
    company: {
      name:    'ARENAH IVATO',
      address: 'Soavinarivo, Antananarivo 102',
      phone:   '+261 XX XXX XX',
      email:   'contact@arenah.mg',
      nif:     'NIF: XXXXXXXXXXXX',
    },
  });
});

// ─── Admin : tous les paiements ───────────────────────────────────────────
router.get('/all', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status, method } = req.query as Record<string, string>;
  let sql = `SELECT p.*, u.email, u.fullname
             FROM payments p JOIN users u ON u.id = p.user_id WHERE 1=1`;
  const params: string[] = [];
  let i = 1;
  if (status) { sql += ` AND p.status = $${i++}`; params.push(status); }
  if (method) { sql += ` AND p.method = $${i++}`; params.push(method); }
  sql += ' ORDER BY p.created_at DESC LIMIT 200';
  res.json(await query(sql, params));
});

export default router;
