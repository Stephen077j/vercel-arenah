import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { paymentsApi, PaymentReceipt } from '@/api/payments';

const fmt = (n: number) => `${Number(n).toLocaleString('fr-FR')} Ar`;

const STATUS_CFG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  success:      { label: 'PAIEMENT CONFIRMÉ',   color: '#16a34a', Icon: CheckCircle2 },
  pending:      { label: 'EN ATTENTE',           color: '#d97706', Icon: Clock        },
  pending_cash: { label: 'ESPÈCES À VALIDER',    color: '#d97706', Icon: Clock        },
  failed:       { label: 'PAIEMENT ÉCHOUÉ',      color: '#dc2626', Icon: XCircle      },
};

export default function ClientPaymentReceipt() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PaymentReceipt | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    paymentsApi.getReceipt(id)
      .then(setData)
      .catch(() => setError('Facture introuvable ou accès refusé.'));
  }, [id]);

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <XCircle className="w-12 h-12 text-red-400" />
      <p className="text-muted-foreground">{error}</p>
      <Link to="/mes-paiements" className="text-sm underline">← Retour à mes paiements</Link>
    </div>
  );

  if (!data) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div style={{ width: 32, height: 32, border: '3px solid #d4a843', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const { payment, client, booking, company } = data;
  const status = STATUS_CFG[payment.status] ?? { label: payment.status.toUpperCase(), color: '#6b7280', Icon: Clock };
  const { Icon: StatusIcon } = status;

  const paidDate = payment.paid_at
    ? new Date(payment.paid_at).toLocaleString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : null;
  const createdDate = new Date(payment.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <>
      {/* Boutons action — cachés à l'impression */}
      <div className="no-print flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <Link to="/mes-paiements" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg"
          style={{ background: '#d4a843', color: '#07070f' }}
        >
          <Printer className="w-4 h-4" /> Imprimer / Sauvegarder PDF
        </button>
      </div>

      {/* Facture */}
      <div id="receipt" style={{ maxWidth: 680, margin: '32px auto 80px', padding: '0 16px', fontFamily: 'system-ui, sans-serif' }}>

        {/* En-tête société */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', color: '#07070f' }}>
              ARENAH<span style={{ color: '#d4a843' }}>.</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{company.address}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{company.phone} · {company.email}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{company.nif}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
              REÇU DE PAIEMENT
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#1e293b' }}>
              {payment.reference}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{createdDate}</div>
          </div>
        </div>

        {/* Statut stamp */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 12, marginBottom: 28,
          background: `${status.color}12`, border: `1.5px solid ${status.color}30`,
        }}>
          <StatusIcon size={20} style={{ color: status.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: status.color }}>{status.label}</div>
            {paidDate && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Validé le {paidDate}</div>}
            {payment.transaction_ref && (
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', marginTop: 1 }}>
                Txn: {payment.transaction_ref}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          {/* Client */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Client</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{client?.fullname || '—'}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{client?.email}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{client?.phone}</div>
          </div>

          {/* Paiement */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Méthode</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{payment.method_label}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Service : {payment.booking_label}</div>
            {booking && typeof booking.detail === 'string' && (
              <div style={{ fontSize: 12, color: '#64748b' }}>{booking.detail}</div>
            )}
          </div>
        </div>

        {/* Tableau montants */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Description</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#1e293b' }}>
                  {payment.booking_label}
                  {booking && typeof booking.detail === 'string' && (
                    <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }}>{booking.detail}</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{fmt(payment.amount)}</td>
              </tr>
              {payment.fee > 0 && (
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>Frais de service (3%)</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>{fmt(payment.fee)}</td>
                </tr>
              )}
              <tr style={{ background: '#0f172a' }}>
                <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 800, color: '#fff' }}>TOTAL</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 18, fontWeight: 900, color: '#d4a843' }}>{fmt(payment.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pied */}
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, borderTop: '1px solid #e2e8f0', paddingTop: 16, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: '#64748b', marginBottom: 4 }}>ARENAH IVATO — Parc de Loisirs</div>
          <div>{company.address}</div>
          <div>{company.phone} · {company.email}</div>
          <div style={{ marginTop: 8, padding: '6px 14px', background: '#f0fdf4', borderRadius: 8, display: 'inline-block', color: '#16a34a', fontWeight: 600, fontSize: 10 }}>
            ✓ Ce reçu est généré automatiquement et fait office de justificatif
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #receipt { max-width: 100% !important; margin: 0 !important; padding: 24px !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
