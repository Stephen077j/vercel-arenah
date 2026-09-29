import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Copy, CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsApi, PaymentMethod, PaymentResult } from '@/api/payments';
import { formatPrice } from '@/client/lib/clientStore';
import PromoField from './PromoField';
import { PromoResult } from '@/api/promos';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string, reference: string) => void;
  amount: number;
  bookingType: string;
  bookingId: string;
  label?: string;
}

// ── Logos de marque ────────────────────────────────────────────────────────
function BrandLogo({ id }: { id: PaymentMethod }) {
  const map: Record<PaymentMethod, { bg: string; letter: string; textColor: string }> = {
    mvola:   { bg: '#006B3C', letter: 'M',  textColor: '#fff' },
    orange:  { bg: '#FF6B00', letter: 'O',  textColor: '#fff' },
    airtel:  { bg: '#C8102E', letter: 'A',  textColor: '#fff' },
    especes: { bg: '#065F46', letter: '₦',  textColor: '#fff' },
    carte:   { bg: '#1A3A8F', letter: 'CB', textColor: '#fff' },
  };
  const b = map[id];
  return (
    <div style={{
      width: 42, height: 42, borderRadius: '50%',
      background: b.bg, color: b.textColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: id === 'carte' ? 11 : 15,
      fontFamily: 'system-ui, sans-serif',
      flexShrink: 0,
    }}>
      {b.letter}
    </div>
  );
}

// Logos Visa + Mastercard inline SVG
function VisaMCLogos() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {/* Visa */}
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect width="32" height="20" rx="3" fill="#1A1F71"/>
        <text x="16" y="14" textAnchor="middle" fill="#F7B600" fontFamily="Arial" fontWeight="bold" fontSize="9" letterSpacing="-0.3">VISA</text>
      </svg>
      {/* Mastercard */}
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect width="32" height="20" rx="3" fill="#252525"/>
        <circle cx="12" cy="10" r="6" fill="#EB001B"/>
        <circle cx="20" cy="10" r="6" fill="#F79E1B"/>
        <path d="M16 5.5a6 6 0 010 9 6 6 0 010-9z" fill="#FF5F00"/>
      </svg>
    </div>
  );
}

interface MethodDef {
  id: PaymentMethod;
  label: string;
  sub: string;
  tag: string;
  tagColor: string;
}

const METHODS: MethodDef[] = [
  { id: 'mvola',   label: 'MVola',          sub: 'Telma · 034 & 038',   tag: 'Mobile money', tagColor: '#006B3C' },
  { id: 'orange',  label: 'Orange Money',   sub: 'Orange · 032 & 037',  tag: 'Mobile money', tagColor: '#FF6B00' },
  { id: 'airtel',  label: 'Airtel Money',   sub: 'Airtel · 033',        tag: 'Mobile money', tagColor: '#C8102E' },
  { id: 'especes', label: 'Espèces',        sub: 'Paiement à la caisse',tag: 'Physique',      tagColor: '#065F46' },
  { id: 'carte',   label: 'Carte bancaire', sub: 'Visa · Mastercard',   tag: 'Bancaire',      tagColor: '#1A3A8F' },
];

type Step = 'choose' | 'confirm' | 'waiting' | 'success' | 'failed';

const IS_DEV = import.meta.env.DEV;

export default function PaymentModal({
  open, onClose, onSuccess, amount, bookingType, bookingId, label,
}: PaymentModalProps) {
  const [method, setMethod]   = useState<PaymentMethod>('mvola');
  const [phone, setPhone]     = useState('');
  const [step, setStep]       = useState<Step>('choose');
  const [result, setResult]   = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [promo, setPromo]     = useState<PromoResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMobile    = ['mvola', 'orange', 'airtel'].includes(method);
  const discount    = promo?.discount ?? 0;
  const netAmount   = Math.max(0, amount - discount);
  const fee         = isMobile ? Math.ceil(netAmount * 0.03) : 0;
  const totalAmount = netAmount + fee;

  useEffect(() => {
    if (open) { setStep('choose'); setResult(null); setPhone(''); setCopied(false); setPromo(null); }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open]);

  const startPolling = (id: string, ref: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const s = await paymentsApi.getStatus(id);
        if (s.status === 'success') { clearInterval(pollRef.current!); setStep('success'); onSuccess(id, ref); }
        else if (s.status === 'failed') { clearInterval(pollRef.current!); setStep('failed'); }
      } catch { /* ignore */ }
    }, 5000);
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.initiate({
        amount: netAmount, method, booking_type: bookingType, booking_id: bookingId,
        customer_phone: phone || undefined,
        notes: promo ? `Code promo: ${promo.code} (-${promo.discount.toLocaleString()} Ar)` : undefined,
      });
      setResult(res);
      if (method === 'especes' || method === 'carte') {
        setStep('waiting');
      } else {
        if (method === 'orange' && res.payment_url) window.open(res.payment_url, '_blank', 'noopener');
        setStep('confirm');
        startPolling(res.id, res.reference);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur paiement');
    } finally { setLoading(false); }
  };

  const handleDemo = async () => {
    if (!result) return;
    setDemoLoading(true);
    try {
      await paymentsApi.demoConfirm(result.id);
      if (pollRef.current) clearInterval(pollRef.current);
      setStep('success');
      onSuccess(result.id, result.reference);
      toast.success('Paiement démo confirmé');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur démo');
    } finally { setDemoLoading(false); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const sel = METHODS.find(m => m.id === method)!;

  // ── Style constants ────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-lg)',
    padding: '12px 14px',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 12,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    outline: 'none',
  };
  const cardSel: React.CSSProperties = {
    ...card,
    borderColor: '#1A3A8F',
    boxShadow: '0 0 0 2px #1A3A8F22',
    background: 'var(--color-background-secondary)',
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="p-0 max-w-[420px] overflow-hidden rounded-2xl border border-border">

        {/* ── En-tête montant ──────────────────────────────────────────── */}
        <div style={{
          background: '#0F1F5C',
          padding: '20px 24px 18px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={16} color="#93C5FD" />
            <span style={{ fontSize: 12, color: '#93C5FD', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Paiement sécurisé · ARENAH
            </span>
          </div>
          {label && (
            <p style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 4 }}>{label}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {formatPrice(totalAmount)}
            </span>
            {fee > 0 && (
              <span style={{ fontSize: 12, color: '#94A3B8' }}>
                dont {formatPrice(fee)} de frais (3 %)
              </span>
            )}
          </div>
        </div>

        {/* ── Corps ────────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 24px 24px' }}>

          {/* STEP : CHOOSE */}
          {step === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 2, fontWeight: 500 }}>
                Choisissez votre moyen de paiement
              </p>

              {METHODS.map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)} style={method === m.id ? cardSel : card}>
                  <BrandLogo id={m.id} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--color-text-primary)' }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{m.sub}</div>
                  </div>
                  {m.id === 'carte' && <VisaMCLogos />}
                  {method === m.id && (
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#1A3A8F', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    </div>
                  )}
                </button>
              ))}

              {isMobile && (
                <div style={{ marginTop: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                    Votre numéro {sel.label} <span style={{ fontWeight: 400 }}>(pour recevoir l'invite)</span>
                  </label>
                  <Input
                    placeholder="034 xx xxx xx"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ height: 40, fontSize: 14 }}
                  />
                </div>
              )}

              {/* Code promo */}
              <div style={{ marginTop: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 5 }}>Code promo</div>
                <PromoField amount={amount} module={bookingType} onApply={setPromo} />
                {promo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--color-border-tertiary)' }}>
                    <span>Remise appliquée</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>−{formatPrice(promo.discount)}</span>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--color-border-tertiary)', margin: '4px 0' }} />

              <button
                onClick={handlePay}
                disabled={loading}
                style={{
                  height: 48, borderRadius: 10, background: '#0F1F5C', color: '#fff',
                  fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
                }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Traitement en cours…' : `Payer ${formatPrice(totalAmount)}`}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 }}>
                <ShieldCheck size={13} color="var(--color-text-tertiary)" />
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  Paiement chiffré · Données protégées
                </span>
              </div>
            </div>
          )}

          {/* STEP : CONFIRM (mobile money) */}
          {step === 'confirm' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BrandLogo id={method} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{sel.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>En attente de votre confirmation</p>
                </div>
              </div>

              <div style={{
                background: 'var(--color-background-secondary)',
                borderRadius: 10, padding: '14px 16px',
                border: '0.5px solid var(--color-border-tertiary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Smartphone size={15} color="var(--color-text-secondary)" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Instructions</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line', color: 'var(--color-text-primary)', margin: 0 }}>
                  {result.instructions?.etapes}
                </p>
              </div>

              <div>
                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Référence à indiquer</p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--color-background-secondary)',
                  borderRadius: 8, padding: '10px 14px',
                  border: '0.5px solid var(--color-border-secondary)',
                }}>
                  <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 14, fontWeight: 600, letterSpacing: '0.05em' }}>
                    {result.reference}
                  </code>
                  <button onClick={() => copy(result.reference)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    {copied ? <CheckCircle2 size={16} color="#22C55E" /> : <Copy size={16} color="var(--color-text-secondary)" />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <Loader2 size={14} className="animate-spin" />
                <span style={{ fontSize: 12 }}>Vérification automatique toutes les 5 secondes…</span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStep('choose'); }}
                  style={{
                    flex: 1, height: 38, borderRadius: 8,
                    background: 'none', border: '0.5px solid var(--color-border-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontSize: 13, color: 'var(--color-text-secondary)',
                  }}
                >
                  <ArrowLeft size={14} /> Changer
                </button>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, height: 38, borderRadius: 8,
                    background: 'none', border: '0.5px solid var(--color-border-secondary)',
                    cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)',
                  }}
                >
                  Fermer
                </button>
              </div>

              {IS_DEV && (
                <button
                  onClick={handleDemo}
                  disabled={demoLoading}
                  style={{
                    height: 36, borderRadius: 8, border: '1.5px dashed #C59F20',
                    background: '#FEFCE8', color: '#92400E', cursor: 'pointer',
                    fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {demoLoading && <Loader2 size={12} className="animate-spin" />}
                  🧪 Démo — Simuler la confirmation du paiement
                </button>
              )}
            </div>
          )}

          {/* STEP : WAITING (espèces / carte) */}
          {step === 'waiting' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto',
                background: method === 'carte' ? '#EFF6FF' : '#ECFDF5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BrandLogo id={method} />
              </div>

              <div>
                <p style={{ fontWeight: 600, fontSize: 17, margin: '0 0 6px' }}>
                  {method === 'especes' ? 'Rendez-vous à la caisse' : 'Paiement par carte'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {method === 'especes'
                    ? `Présentez la référence ci-dessous à la caisse ARENAH et réglez ${formatPrice(amount)}.`
                    : `Présentez votre carte à la caisse ARENAH pour payer ${formatPrice(amount)}.`}
                </p>
              </div>

              <div style={{
                background: 'var(--color-background-secondary)',
                borderRadius: 10, padding: '12px 16px',
                border: '0.5px solid var(--color-border-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '0 0 3px' }}>Votre référence</p>
                  <code style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{result.reference}</code>
                </div>
                <button onClick={() => copy(result.reference)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                  {copied ? <CheckCircle2 size={18} color="#22C55E" /> : <Copy size={18} color="var(--color-text-secondary)" />}
                </button>
              </div>

              <div style={{
                background: '#FFFBEB', border: '0.5px solid #FCD34D',
                borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400E',
              }}>
                En attente de validation par la caisse
              </div>

              {IS_DEV && (
                <button
                  onClick={handleDemo}
                  disabled={demoLoading}
                  style={{
                    height: 36, borderRadius: 8, border: '1.5px dashed #C59F20',
                    background: '#FEFCE8', color: '#92400E', cursor: 'pointer',
                    fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {demoLoading && <Loader2 size={12} className="animate-spin" />}
                  🧪 Démo — Simuler la confirmation du paiement
                </button>
              )}

              <button
                onClick={onClose}
                style={{
                  height: 40, borderRadius: 8, background: 'none',
                  border: '0.5px solid var(--color-border-secondary)',
                  cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)',
                }}
              >
                Fermer — je paierai à la caisse
              </button>
            </div>
          )}

          {/* STEP : SUCCESS */}
          {step === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto',
                background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={36} color="#16A34A" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 20, color: '#15803D', margin: '0 0 6px' }}>Paiement validé</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>Votre réservation est confirmée.</p>
                {result && <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 6 }}>Réf. {result.reference}</p>}
              </div>
              <button
                onClick={onClose}
                style={{
                  height: 44, borderRadius: 10, background: '#15803D', color: '#fff',
                  fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </div>
          )}

          {/* STEP : FAILED */}
          {step === 'failed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto',
                background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XCircle size={36} color="#DC2626" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 18, color: '#DC2626', margin: '0 0 6px' }}>Paiement échoué</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                  Vérifiez votre solde ou réessayez avec un autre moyen.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setStep('choose')}
                  style={{
                    flex: 1, height: 42, borderRadius: 8, background: '#0F1F5C', color: '#fff',
                    fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
                  }}
                >
                  Réessayer
                </button>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, height: 42, borderRadius: 8, background: 'none',
                    border: '0.5px solid var(--color-border-secondary)',
                    cursor: 'pointer', fontSize: 14, color: 'var(--color-text-secondary)',
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
