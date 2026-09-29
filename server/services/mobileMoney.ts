/**
 * Mobile Money Integration — MVola, Orange Money, Airtel Money
 *
 * Sandbox (PAYMENT_ENV != 'production'): Telma devapi.mvola.mg, Airtel UAT, Orange sandbox
 * Production: api.mvola.mg, openapi.airtel.africa, api.orange.com
 *
 * If credentials are missing, returns MANUAL mode so staff confirm manually.
 */

const SANDBOX = process.env.PAYMENT_ENV !== 'production';

// ─── Token cache ───────────────────────────────────────────────────────────
const tokenCache: Record<string, { value: string; exp: number }> = {};

function cacheToken(key: string, value: string, expiresIn: number) {
  tokenCache[key] = { value, exp: Date.now() + (expiresIn - 60) * 1000 };
}

function cachedToken(key: string): string | null {
  const t = tokenCache[key];
  return t && Date.now() < t.exp ? t.value : null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function hasEnv(...keys: string[]): boolean {
  return keys.every(k => !!process.env[k]);
}

export type MobileMoneyResult =
  | { mode: 'api';    serverRef: string; paymentUrl?: string }
  | { mode: 'manual'; reason: string };

// ─── MVola ─────────────────────────────────────────────────────────────────
const MVOLA_BASE = SANDBOX
  ? 'https://devapi.mvola.mg'
  : 'https://api.mvola.mg';

async function getMvolaToken(): Promise<string> {
  const cached = cachedToken('mvola');
  if (cached) return cached;

  const creds = Buffer.from(
    `${process.env.MVOLA_CONSUMER_KEY}:${process.env.MVOLA_CONSUMER_SECRET}`
  ).toString('base64');

  const r = await fetch(`${MVOLA_BASE}/mvola/mm/api/v1_0/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=EXT_INT_MVOLA_SCOPE',
  });
  if (!r.ok) throw new Error(`MVola auth: ${await r.text()}`);

  const d = await r.json() as { access_token: string; expires_in: number };
  cacheToken('mvola', d.access_token, d.expires_in);
  return d.access_token;
}

export async function initiateMvola(opts: {
  amount: number;
  reference: string;
  customerPhone: string;
  callbackUrl: string;
}): Promise<MobileMoneyResult> {
  if (!hasEnv('MVOLA_CONSUMER_KEY', 'MVOLA_CONSUMER_SECRET', 'MVOLA_MERCHANT_NUMBER')) {
    return { mode: 'manual', reason: 'MVola credentials not configured' };
  }

  const token      = await getMvolaToken();
  const merchant   = process.env.MVOLA_MERCHANT_NUMBER!;
  const partner    = process.env.MVOLA_PARTNER_NAME || 'ARENAH';
  const correlId   = crypto.randomUUID();

  const r = await fetch(`${MVOLA_BASE}/mvola/mm/api/v1_0/transaction/type/merchantpay`, {
    method: 'POST',
    headers: {
      'Authorization':             `Bearer ${token}`,
      'X-Callback-URL':            opts.callbackUrl,
      'X-CorrelationID':           correlId,
      'UserLanguage':              'FR',
      'UserAccountIdentifier':     `msisdn;${merchant}`,
      'partnerName':               partner,
      'X-Version':                 '1.0',
      'Cache-Control':             'no-cache',
      'Content-Type':              'application/json',
    },
    body: JSON.stringify({
      amount:                                       String(opts.amount),
      currency:                                     'Ar',
      descriptionText:                              `Paiement ARENAH ${opts.reference}`,
      requestingOrganisationTransactionReference:   opts.reference,
      requestDate:                                  new Date().toISOString().slice(0, -1),
      originalTransactionReference:                 '',
      debitParty:  [{ key: 'msisdn', value: opts.customerPhone }],
      creditParty: [{ key: 'msisdn', value: merchant }],
    }),
  });

  if (!r.ok) throw new Error(`MVola pay: ${await r.text()}`);
  const d = await r.json() as { serverCorrelationId?: string };
  return { mode: 'api', serverRef: d.serverCorrelationId ?? correlId };
}

// ─── Orange Money ──────────────────────────────────────────────────────────
const ORANGE_BASE = 'https://api.orange.com';

async function getOrangeToken(): Promise<string> {
  const cached = cachedToken('orange');
  if (cached) return cached;

  const creds = Buffer.from(
    `${process.env.ORANGE_CLIENT_ID}:${process.env.ORANGE_CLIENT_SECRET}`
  ).toString('base64');

  const r = await fetch(`${ORANGE_BASE}/oauth/v3/token`, {
    method: 'POST',
    headers: {
      'Authorization':  `Basic ${creds}`,
      'Content-Type':   'application/x-www-form-urlencoded',
      'Accept':         'application/json',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`Orange auth: ${await r.text()}`);

  const d = await r.json() as { access_token: string; expires_in: number };
  cacheToken('orange', d.access_token, d.expires_in);
  return d.access_token;
}

export async function initiateOrange(opts: {
  amount: number;
  reference: string;
  callbackUrl: string;
  returnUrl: string;
}): Promise<MobileMoneyResult> {
  if (!hasEnv('ORANGE_CLIENT_ID', 'ORANGE_CLIENT_SECRET', 'ORANGE_MERCHANT_KEY')) {
    return { mode: 'manual', reason: 'Orange Money credentials not configured' };
  }

  const token = await getOrangeToken();

  const r = await fetch(`${ORANGE_BASE}/orange-money-webpay/MG/v1/webpayment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
    body: JSON.stringify({
      merchant_key: process.env.ORANGE_MERCHANT_KEY,
      currency:     'MGA',
      order_id:     opts.reference,
      amount:       opts.amount,
      return_url:   opts.returnUrl,
      cancel_url:   opts.returnUrl,
      notif_url:    opts.callbackUrl,
      lang:         'fr',
    }),
  });

  if (!r.ok) throw new Error(`Orange pay: ${await r.text()}`);
  const d = await r.json() as { payment_url?: string };
  return { mode: 'api', serverRef: opts.reference, paymentUrl: d.payment_url };
}

// ─── Airtel Money ──────────────────────────────────────────────────────────
const AIRTEL_BASE = SANDBOX
  ? 'https://openapiuat.airtel.africa'
  : 'https://openapi.airtel.africa';

async function getAirtelToken(): Promise<string> {
  const cached = cachedToken('airtel');
  if (cached) return cached;

  const r = await fetch(`${AIRTEL_BASE}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type:    'client_credentials',
    }),
  });
  if (!r.ok) throw new Error(`Airtel auth: ${await r.text()}`);

  const d = await r.json() as { access_token: string; expires_in: number };
  cacheToken('airtel', d.access_token, d.expires_in);
  return d.access_token;
}

export async function initiateAirtel(opts: {
  amount: number;
  reference: string;
  customerPhone: string;
}): Promise<MobileMoneyResult> {
  if (!hasEnv('AIRTEL_CLIENT_ID', 'AIRTEL_CLIENT_SECRET')) {
    return { mode: 'manual', reason: 'Airtel Money credentials not configured' };
  }

  const token = await getAirtelToken();

  // Madagascar MSISDN: remove leading 0, prepend 261
  const msisdn = opts.customerPhone.replace(/\s+/g, '').replace(/^0/, '261');

  const r = await fetch(`${AIRTEL_BASE}/merchant/v1/payments/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Country':     'MG',
      'X-Currency':    'MGA',
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
    body: JSON.stringify({
      reference:   opts.reference,
      subscriber:  { country: 'MG', currency: 'MGA', msisdn },
      transaction: { amount: opts.amount, country: 'MG', currency: 'MGA', id: opts.reference },
    }),
  });

  if (!r.ok) throw new Error(`Airtel pay: ${await r.text()}`);
  const d = await r.json() as { data?: { transaction?: { id?: string } } };
  return { mode: 'api', serverRef: d.data?.transaction?.id ?? opts.reference };
}
