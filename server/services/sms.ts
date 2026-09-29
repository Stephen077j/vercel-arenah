/**
 * Service SMS — Infobip API
 * Inscription gratuite sur infobip.com (crédit de test inclus)
 * Alternative Africa's Talking pour Madagascar
 */

const BASE_URL  = process.env.INFOBIP_BASE_URL ?? '';
const API_KEY   = process.env.INFOBIP_API_KEY  ?? '';
const SENDER    = process.env.SMS_SENDER       ?? 'ARENAH';

async function sendSms(to: string, text: string): Promise<boolean> {
  if (!API_KEY || !BASE_URL) {
    console.log(`[SMS] (Infobip non configuré) → ${to}: ${text}`);
    return false;
  }
  // Normaliser numéro malgache (0xx → +261xx)
  const phone = to.replace(/^0/, '+261').replace(/\s/g, '');
  try {
    const res = await fetch(`${BASE_URL}/sms/2/text/advanced`, {
      method:  'POST',
      headers: {
        'Authorization': `App ${API_KEY}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        messages: [{ from: SENDER, destinations: [{ to: phone }], text }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await res.json() as { messages?: { status: { groupName: string } }[] };
    const ok = data.messages?.[0]?.status?.groupName === 'PENDING' || data.messages?.[0]?.status?.groupName === 'SENT';
    console.log(`[SMS] ${ok ? '✓' : '✗'} ${phone}: ${text.slice(0,40)}…`);
    return ok;
  } catch (e) {
    console.error(`[SMS] Erreur envoi ${to}:`, e);
    return false;
  }
}

// ── Messages prédéfinis ────────────────────────────────────────────────────

export async function smsPaymentConfirmed(phone: string, reference: string, amount: number): Promise<void> {
  const fmt = `${Number(amount).toLocaleString('fr-FR')} Ar`;
  await sendSms(phone, `ARENAH: Paiement de ${fmt} confirme. Ref: ${reference}. Merci!`);
}

export async function smsBookingConfirmed(phone: string, module: string, date?: string): Promise<void> {
  const d = date ? ` le ${date}` : '';
  await sendSms(phone, `ARENAH: Reservation ${module}${d} confirmee. Presentez-vous a l'accueil. Merci!`);
}

export async function smsReminderJ1(phone: string, module: string, date: string): Promise<void> {
  await sendSms(phone, `ARENAH Rappel: Vous avez un(e) ${module} demain ${date}. A bientot!`);
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  await sendSms(phone, `ARENAH: Votre code de verification est ${code}. Valable 5 min. Ne le partagez pas.`);
}

export async function smsNewPaymentForAdmin(adminPhone: string, module: string, amount: number): Promise<void> {
  const fmt = `${Number(amount).toLocaleString('fr-FR')} Ar`;
  await sendSms(adminPhone, `ARENAH Admin: Nouveau paiement ${module} de ${fmt} recu.`);
}

export async function smsOrderReady(phone: string, module: string): Promise<void> {
  await sendSms(phone, `ARENAH: Votre commande ${module} est prete! Venez la recuperer. Merci!`);
}
