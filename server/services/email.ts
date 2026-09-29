import nodemailer from 'nodemailer';

// ── Transporter (lazy-init) ───────────────────────────────────────────────
let _transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _transport;
}

// ── Template de base ──────────────────────────────────────────────────────
function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">

  <!-- Header -->
  <tr><td style="background:#07070f;border-radius:16px 16px 0 0;padding:28px 36px">
    <table width="100%"><tr>
      <td><span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.02em">ARENAH<span style="color:#d4a843">.</span></span></td>
      <td align="right"><span style="font-size:11px;color:#64748b;letter-spacing:0.08em;text-transform:uppercase">Parc de Loisirs</span></td>
    </tr></table>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    ${content}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;padding:20px 36px;text-align:center">
    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.7">
      ARENAH IVATO · Soavinarivo, Antananarivo 102<br>
      contact@arenah.mg · Ce message est automatique, ne pas répondre.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ── Envoi générique ───────────────────────────────────────────────────────
async function send(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SMTP_PASS) {
    console.log(`[EMAIL] (SMTP non configuré) → ${to} | ${subject}`);
    return;
  }
  try {
    await getTransport().sendMail({ from: process.env.EMAIL_FROM ?? 'ARENAH <contact@arenah.mg>', to, subject, html });
    console.log(`[EMAIL] ✓ ${to} | ${subject}`);
  } catch (e) {
    console.error(`[EMAIL] ✗ ${to} | ${subject}`, e);
  }
}

// ── Templates spécifiques ─────────────────────────────────────────────────

export async function sendPaymentConfirmed(opts: {
  to: string; fullname: string;
  reference: string; amount: number; method: string;
  service: string; receiptUrl: string;
}): Promise<void> {
  const { to, fullname, reference, amount, method, service, receiptUrl } = opts;
  const fmt = (n: number) => `${Number(n).toLocaleString('fr-FR')} Ar`;
  const METHOD: Record<string,string> = { mvola:'MVola', orange:'Orange Money', airtel:'Airtel Money', especes:'Espèces', carte:'Carte bancaire' };

  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;width:60px;height:60px;background:#f0fdf4;border-radius:50%;line-height:60px;font-size:28px">✅</div>
    </div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;text-align:center">Paiement confirmé</h1>
    <p style="margin:0 0 28px;color:#64748b;text-align:center;font-size:14px">Bonjour ${fullname}, votre paiement a bien été reçu.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px">
      <tr><td style="padding:20px 24px">
        ${[
          ['Référence',   `<code style="font-family:monospace;font-weight:700;color:#d4a843">${reference}</code>`],
          ['Service',     service],
          ['Montant',     `<strong style="color:#16a34a;font-size:17px">${fmt(amount)}</strong>`],
          ['Méthode',     METHOD[method] ?? method],
          ['Date',        new Date().toLocaleString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })],
        ].map(([label, value]) => `
          <table width="100%" style="margin-bottom:10px"><tr>
            <td style="font-size:12px;color:#94a3b8;width:120px;vertical-align:top;padding-top:2px">${label}</td>
            <td style="font-size:14px;color:#0f172a">${value}</td>
          </tr></table>
        `).join('')}
      </td></tr>
    </table>

    <div style="text-align:center;margin-bottom:24px">
      <a href="${receiptUrl}" style="display:inline-block;padding:12px 28px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">
        📄 Télécharger ma facture
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#64748b;text-align:center">
      Merci de votre confiance. À bientôt chez ARENAH IVATO 🌟
    </p>
  `;
  await send(to, `✅ Paiement confirmé — ${reference}`, baseTemplate('Paiement confirmé', content));
}

export async function sendBookingConfirmation(opts: {
  to: string; fullname: string;
  module: string; details: string;
  date?: string; amount: number; bookingRef: string;
}): Promise<void> {
  const { to, fullname, module, details, date, amount, bookingRef } = opts;
  const fmt = (n: number) => `${Number(n).toLocaleString('fr-FR')} Ar`;
  const MODULE_ICONS: Record<string,string> = {
    hotel:'🏨', gym:'💪', salon:'✂️', field:'⚽', pool:'🏊', event:'🎪', show:'🎭', cybercafe:'🖥️', restaurant:'🍽️', boutique:'🛍️',
  };
  const icon = MODULE_ICONS[module] ?? '📋';

  const content = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;background:#eff6ff;border-radius:16px;padding:16px 24px;font-size:36px">${icon}</div>
    </div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;text-align:center">Réservation confirmée</h1>
    <p style="margin:0 0 28px;color:#64748b;text-align:center;font-size:14px">Bonjour ${fullname}, votre réservation est enregistrée.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px">
      <tr><td style="padding:20px 24px">
        ${[
          ['Réf.',       `<code style="font-family:monospace;font-size:12px;color:#64748b">${bookingRef.slice(0,8)}</code>`],
          ['Service',    `<strong>${module.charAt(0).toUpperCase()+module.slice(1)}</strong> — ${details}`],
          date ? ['Date', `<strong style="color:#0f172a">${date}</strong>`] : null,
          ['Montant',    fmt(amount)],
        ].filter(Boolean).map(row => `
          <table width="100%" style="margin-bottom:10px"><tr>
            <td style="font-size:12px;color:#94a3b8;width:80px;vertical-align:top;padding-top:2px">${row![0]}</td>
            <td style="font-size:14px;color:#0f172a">${row![1]}</td>
          </tr></table>
        `).join('')}
      </td></tr>
    </table>

    <div style="background:#fffbeb;border-radius:10px;border:1px solid #fcd34d;padding:14px 18px;margin-bottom:24px;font-size:13px;color:#92400e">
      ℹ️ Présentez-vous à l'accueil ARENAH IVATO avec votre numéro de référence. Un rappel vous sera envoyé la veille.
    </div>

    <p style="margin:0;font-size:13px;color:#64748b;text-align:center">À très bientôt chez ARENAH IVATO ${icon}</p>
  `;
  await send(to, `${icon} Réservation confirmée — ${module}`, baseTemplate('Réservation confirmée', content));
}

export async function sendReminderJ1(opts: {
  to: string; fullname: string;
  module: string; details: string; date: string;
}): Promise<void> {
  const { to, fullname, module, details, date } = opts;
  const MODULE_ICONS: Record<string,string> = { hotel:'🏨', gym:'💪', salon:'✂️', field:'⚽', pool:'🏊', event:'🎪', show:'🎭', cybercafe:'🖥️' };
  const icon = MODULE_ICONS[module] ?? '🔔';

  const content = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:30px">⏰</div>
    </div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;text-align:center">Rappel — demain !</h1>
    <p style="margin:0 0 24px;color:#64748b;text-align:center">Bonjour ${fullname}, vous avez une réservation <strong>demain</strong>.</p>

    <table width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px"><tr><td style="padding:20px 24px">
      <p style="margin:0 0 4px;font-size:13px;color:#94a3b8">Service</p>
      <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#0f172a">${icon} ${module.charAt(0).toUpperCase()+module.slice(1)} — ${details}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#94a3b8">Date & heure</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#d97706">${date}</p>
    </td></tr></table>

    <div style="background:#f0fdf4;border-radius:10px;border:1px solid #86efac;padding:14px 18px;font-size:13px;color:#166534">
      ✅ Présentez-vous 10 minutes avant · Soavinarivo, Antananarivo 102
    </div>
  `;
  await send(to, `⏰ Rappel — votre réservation ${module} demain`, baseTemplate('Rappel J-1', content));
}

export async function sendMonthlyReport(opts: {
  to: string; month: string;
  totalRevenue: number; totalBookings: number; totalOrders: number;
  byModule: { module: string; revenue: number; count: number }[];
}): Promise<void> {
  const { to, month, totalRevenue, totalBookings, totalOrders, byModule } = opts;
  const fmt = (n: number) => `${Number(n).toLocaleString('fr-FR')} Ar`;

  const rows = byModule.map(m => `
    <tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:10px 0;font-size:13px;color:#0f172a;text-transform:capitalize">${m.module}</td>
      <td style="padding:10px 0;font-size:13px;color:#64748b;text-align:center">${m.count}</td>
      <td style="padding:10px 0;font-size:13px;font-weight:600;color:#d4a843;text-align:right">${fmt(m.revenue)}</td>
    </tr>
  `).join('');

  const content = `
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a">Rapport mensuel</h1>
    <p style="margin:0 0 28px;color:#64748b;font-size:14px">${month} · ARENAH IVATO</p>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px">
      ${[
        { label:'Revenus totaux', value: fmt(totalRevenue), color:'#d4a843' },
        { label:'Réservations',   value: totalBookings,     color:'#38bdf8' },
        { label:'Commandes',      value: totalOrders,       color:'#a78bfa' },
      ].map(k => `
        <table style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;width:100%"><tr><td style="padding:16px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:${k.color}">${k.value}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:3px">${k.label}</div>
        </td></tr></table>
      `).join('')}
    </div>

    <table width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;border-collapse:collapse">
      <tr style="background:#0f172a;border-radius:12px 12px 0 0">
        <th style="padding:12px 16px;font-size:11px;color:#94a3b8;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Module</th>
        <th style="padding:12px 16px;font-size:11px;color:#94a3b8;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Transactions</th>
        <th style="padding:12px 16px;font-size:11px;color:#94a3b8;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Revenus</th>
      </tr>
      <tr><td colspan="3" style="padding:0 16px">${rows}</td></tr>
    </table>
  `;
  await send(to, `📊 Rapport mensuel ARENAH — ${month}`, baseTemplate('Rapport mensuel', content));
}

export async function sendOtp(phone: string, to: string, code: string, purpose: string): Promise<void> {
  const labels: Record<string,string> = { login:'connexion', payment:'confirmation de paiement', verify:'vérification' };
  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#eff6ff;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px">🔐</div>
    </div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;text-align:center">Code de vérification</h1>
    <p style="margin:0 0 28px;color:#64748b;text-align:center">Pour votre ${labels[purpose] ?? purpose} :</p>

    <div style="background:#0f172a;border-radius:14px;padding:24px;text-align:center;margin-bottom:24px">
      <span style="font-size:38px;font-weight:900;color:#d4a843;letter-spacing:0.15em;font-family:monospace">${code}</span>
    </div>

    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center">
      Ce code expire dans <strong>5 minutes</strong>.<br>
      Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.
    </p>
  `;
  await send(to, `🔐 Code OTP ARENAH — ${code}`, baseTemplate('Code de vérification', content));
}
