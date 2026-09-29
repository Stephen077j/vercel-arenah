import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, TrendingUp, Users, ShoppingCart, Activity, ArrowRight, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useClientAuth } from '../lib/clientAuth';
import { toast } from 'sonner';
import logoIcon from '@/assets/logo-icon.png';

interface KPI {
  revenue_30d: number;
  bookings_30d: number;
  new_clients_30d: number;
  by_module: { module: string; count: number; revenue: number }[];
}
interface Booking { id: string; source: string; client: string; date: string; status: string; detail: string; }
interface Payment { id: string; amount: number; booking_type: string; status: string; created_at: string; client: string; email: string; }
interface AppUser { id: string; fullname: string; email: string; phone: string; role: string; created_at: string; total_spent: number; }

const STATUS_COLOR: Record<string, string> = {
  confirmed: '#22c55e', pending: '#f59e0b', cancelled: '#ef4444', annule: '#ef4444',
  active: '#3b82f6', success: '#22c55e',
};

function fmt(n: number) { return n.toLocaleString('fr-FR'); }

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '22', color }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

export default function ProprietaireDashboard() {
  const { user } = useClientAuth();
  const [kpi, setKpi]           = useState<KPI | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers]       = useState<AppUser[]>([]);
  const [loading, setLoading]   = useState(true);

  const token = localStorage.getItem('arenah_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    (async () => {
      try {
        const [k, b, p, u] = await Promise.all([
          fetch('/api/proprietaire/kpi', { headers }).then(r => r.json()),
          fetch('/api/proprietaire/recent-bookings', { headers }).then(r => r.json()),
          fetch('/api/proprietaire/payments', { headers }).then(r => r.json()),
          fetch('/api/proprietaire/users', { headers }).then(r => r.json()),
        ]);
        if (k.error) { toast.error(k.error); return; }
        setKpi(k); setBookings(Array.isArray(b) ? b : []); setPayments(Array.isArray(p) ? p : []); setUsers(Array.isArray(u) ? u : []);
      } catch { toast.error('Erreur de chargement'); }
      finally { setLoading(false); }
    })();
  }, []);

  if (!user || (user.role !== 'proprietaire' && user.role !== 'super_admin')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-xl font-bold">Accès réservé aux propriétaires</h2>
        <Link to="/" className="text-sm underline text-muted-foreground">Retour à l'accueil</Link>
      </div>
    );
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="w-10 h-10 animate-spin text-primary"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoIcon} style={{ width: 36, height: 36 }} alt="ARENAH"/>
            <div>
              <h1 className="font-bold text-sm">ARENAH</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Tableau Propriétaire</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-[10px]">{user.fullname}</Badge>
            <Badge style={{ background: '#d4a84322', color: '#d4a843', borderColor: '#d4a84344' }}>Propriétaire</Badge>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Eye className="w-3 h-3"/> Voir le site
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPIs 30j */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">30 derniers jours</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Revenus" value={`${fmt(kpi?.revenue_30d ?? 0)} Ar`} icon={<TrendingUp className="w-4 h-4"/>} color="#22c55e"/>
            <KpiCard label="Réservations" value={fmt(kpi?.bookings_30d ?? 0)} icon={<ShoppingCart className="w-4 h-4"/>} color="#d4a843"/>
            <KpiCard label="Nouveaux clients" value={fmt(kpi?.new_clients_30d ?? 0)} icon={<Users className="w-4 h-4"/>} color="#3b82f6"/>
            <KpiCard label="Modules actifs" value={String(kpi?.by_module.length ?? 0)} icon={<Activity className="w-4 h-4"/>} color="#7c3aed"/>
          </div>
        </section>

        {/* Modules */}
        {kpi && kpi.by_module.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Revenue par module</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {kpi.by_module.map(m => (
                <div key={m.module} className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground capitalize truncate">{m.module}</p>
                  <p className="font-bold text-sm mt-0.5">{fmt(m.revenue)} Ar</p>
                  <p className="text-[10px] text-muted-foreground">{m.count} résa</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Données détaillées */}
        <Tabs defaultValue="bookings">
          <TabsList>
            <TabsTrigger value="bookings">Réservations récentes ({bookings.length})</TabsTrigger>
            <TabsTrigger value="payments">Paiements ({payments.length})</TabsTrigger>
            <TabsTrigger value="clients">Clients ({users.length})</TabsTrigger>
          </TabsList>

          {/* Réservations */}
          <TabsContent value="bookings" className="mt-4">
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['Module', 'Client', 'Date', 'Détail', 'Statut'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => (
                    <tr key={b.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                      <td className="px-4 py-2.5 capitalize">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">{b.source}</span>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{b.client}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{new Date(b.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[180px]">{b.detail}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: (STATUS_COLOR[b.status] ?? '#888') + '22', color: STATUS_COLOR[b.status] ?? '#888' }}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">Aucune réservation récente</div>
              )}
            </div>
          </TabsContent>

          {/* Paiements */}
          <TabsContent value="payments" className="mt-4">
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['Client', 'Module', 'Montant', 'Statut', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{p.client}</div>
                        <div className="text-[10px] text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="px-4 py-2.5 capitalize text-muted-foreground">{p.booking_type}</td>
                      <td className="px-4 py-2.5 font-bold">{fmt(p.amount)} Ar</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: (STATUS_COLOR[p.status] ?? '#888') + '22', color: STATUS_COLOR[p.status] ?? '#888' }}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {new Date(p.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">Aucun paiement récent</div>
              )}
            </div>
          </TabsContent>

          {/* Clients */}
          <TabsContent value="clients" className="mt-4">
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['Nom', 'Email', 'Téléphone', 'Rôle', 'Dépenses', 'Inscription'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                      <td className="px-4 py-2.5 font-medium">{u.fullname}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{u.email}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{u.phone || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">{u.role}</span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: '#d4a843' }}>{fmt(Number(u.total_spent))} Ar</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">Aucun client</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground py-4">
          Tableau de bord propriétaire · Lecture seule · <Link to="/" className="underline">Retour au site</Link>
        </p>
      </main>
    </div>
  );
}
