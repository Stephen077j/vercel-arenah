import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard, Loader2, RefreshCw, ShieldCheck,
  CheckCircle2, XCircle, Clock, Banknote, Smartphone, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paymentsApi, Payment, PaymentMethod } from '@/api/payments';
import { formatPrice } from '../lib/clientStore';
import { toast } from 'sonner';

const METHOD_META: Record<PaymentMethod | string, { label: string; color: string; Icon: React.ElementType }> = {
  mvola:    { label: 'MVola',        color: '#006B3C', Icon: Smartphone },
  orange:   { label: 'Orange Money', color: '#FF6B00', Icon: Smartphone },
  airtel:   { label: 'Airtel Money', color: '#C8102E', Icon: Smartphone },
  especes:  { label: 'Espèces',      color: '#065F46', Icon: Banknote },
  carte:    { label: 'Carte',        color: '#1A3A8F', Icon: CreditCard },
};

const STATUS_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  success:      { label: 'Payé',             color: 'text-emerald-700 bg-emerald-500/15', Icon: CheckCircle2 },
  pending:      { label: 'En attente',       color: 'text-amber-700 bg-amber-500/15',     Icon: Clock },
  pending_cash: { label: 'Esp. à valider',   color: 'text-amber-700 bg-amber-500/15',     Icon: Clock },
  failed:       { label: 'Échoué',           color: 'text-red-700 bg-red-500/15',         Icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  order:       'Boutique',
  restaurant:  'Restaurant',
  hotel:       'Hôtel',
  gym:         'Gym',
  gym_coach:   'Coach gym',
  salon:       'Salon',
  field:       'Terrain',
  pool:        'Piscine',
  pool_course: 'Cours piscine',
  event:       'Événementiel',
  show:        'Spectacle',
  cybercafe:   'Cybercafé',
};

const ClientPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await paymentsApi.getMy();
      setPayments(data);
    } catch {
      toast.error('Impossible de charger l\'historique');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const total = payments.filter(p => p.status === 'success').reduce((s, p) => s + p.amount + p.fee, 0);
  const pending = payments.filter(p => ['pending', 'pending_cash'].includes(p.status)).length;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-4xl">Mes paiements</h1>
          <p className="text-muted-foreground mt-1">Historique de toutes vos transactions</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Résumé */}
      {!loading && payments.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold">{payments.length}</div>
            <div className="text-xs text-muted-foreground">Transactions</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{formatPrice(total)}</div>
            <div className="text-xs text-muted-foreground">Total payé</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <div className={`text-2xl font-bold ${pending > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{pending}</div>
            <div className="text-xs text-muted-foreground">En attente</div>
          </div>
        </div>
      )}

      {/* Badge sécurité */}
      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-500/10 rounded-xl px-4 py-2.5 mb-6 border border-emerald-500/20">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        Toutes les transactions sont sécurisées et chiffrées · ARENAH IVATO
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucun paiement enregistré</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => {
            const method = METHOD_META[p.method] ?? { label: p.method, color: '#64748b', Icon: CreditCard };
            const status = STATUS_META[p.status] ?? { label: p.status, color: 'text-muted-foreground bg-muted', Icon: Clock };
            const { Icon: MethodIcon } = method;
            const { Icon: StatusIcon } = status;
            const d = new Date(p.created_at);
            const dateStr = isNaN(d.getTime()) ? p.created_at : d.toLocaleString('fr-FR', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  {/* Icône méthode */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${method.color}18` }}
                  >
                    <MethodIcon className="w-5 h-5" style={{ color: method.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-semibold text-sm">
                          {method.label} · {TYPE_LABELS[p.booking_type] ?? p.booking_type}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          Réf. {p.reference}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold">{formatPrice(p.amount + p.fee)}</div>
                        {p.fee > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            dont {formatPrice(p.fee)} frais (3%)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] text-muted-foreground">{dateStr}</div>
                        {p.status === 'success' && (
                          <Link
                            to={`/mes-paiements/${p.id}/facture`}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 hover:text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/15 px-2 py-0.5 rounded-full transition-colors"
                          >
                            <Download className="w-2.5 h-2.5" />
                            Facture
                          </Link>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>

                {p.notes && (
                  <div className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    {p.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientPayments;
