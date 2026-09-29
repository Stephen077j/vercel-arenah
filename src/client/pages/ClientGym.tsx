import { useEffect, useState, lazy, Suspense } from 'react';
const GymSessionBooking = lazy(() => import('../components/GymSessionBooking'));
import { motion } from 'framer-motion';
import { Dumbbell, Check, UserCheck, Calendar, RefreshCw, X, Loader2, ChevronLeft, ChevronRight, Flame, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { gymApi } from '@/api/bookings';
import { formatPrice } from '@/client/lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from '../components/PaymentModal';
import ModuleBanner from '../components/ModuleBanner';
import { GYM_SLIDES } from '../lib/bannerSlides';

interface GymPlan  { id: string; label: string; days: number; price: number; }
interface GymCoach { id: string; name: string; specialty: string; hour_price: number; }
interface GymSub   { id: string; plan_label: string; start_date: string; end_date: string; price: number; status: string; customer_name: string | null; auto_renew?: boolean; }
interface CoachBooking { id: string; coach_name: string; date: string; hours: number; total: number; status: string; }

const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function CheckinHeatmap({ dates }: { dates: string[] }) {
  const set = new Set(dates.map(d => d.slice(0, 10)));
  const today = new Date();
  const WEEKS = 12;
  const weeks = Array.from({ length: WEEKS }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (WEEKS - 1 - wi) * 7 - (6 - di));
      const key = d.toISOString().slice(0, 10);
      return { key, checked: set.has(key), future: d > today };
    })
  );
  const total = dates.filter(ds => {
    const dt = new Date(ds);
    const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - WEEKS * 7);
    return dt >= cutoff && dt <= today;
  }).length;
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 flex-shrink-0">
            {week.map(day => (
              <div key={day.key} title={day.key}
                className={`w-3.5 h-3.5 rounded-sm ${day.future ? 'opacity-0' : day.checked ? 'bg-emerald-500' : 'bg-muted'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
        <span className="font-semibold text-foreground">{total}</span>&nbsp;visite{total !== 1 ? 's' : ''} sur 12 semaines
        <span className="ml-auto flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-muted" /> absent
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 ml-1" /> présent
        </span>
      </div>
    </div>
  );
}

const COACH_GRADIENTS = [
  'from-emerald-400 to-teal-600',
  'from-violet-400 to-purple-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-blue-400 to-indigo-600',
];

const ClientGym = () => {
  const { user } = useClientAuth();

  const [plans, setPlans] = useState<GymPlan[]>([]);
  const [coaches, setCoaches] = useState<GymCoach[]>([]);
  const [subs, setSubs] = useState<GymSub[]>([]);
  const [coachBks, setCoachBks] = useState<CoachBooking[]>([]);
  const [checkinDates, setCheckinDates] = useState<string[]>([]);
  const [checkinCount, setCheckinCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState(user?.fullname ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);

  const [coachId, setCoachId] = useState('');
  const [coachDate, setCoachDate] = useState(new Date().toISOString().split('T')[0]);
  const [coachHours, setCoachHours] = useState(1);

  const [placing, setPlacing] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payData, setPayData] = useState<{ id: string; amount: number; type: 'gym' | 'gym_coach'; label: string } | null>(null);

  const [cancelCoachId, setCancelCoachId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const loadCheckins = () =>
    gymApi.getCheckins().then((d: { dates: string[]; count: number }) => {
      setCheckinDates(d.dates); setCheckinCount(d.count);
    }).catch(() => {});

  useEffect(() => {
    Promise.all([gymApi.getPlans(), gymApi.getCoaches()])
      .then(([p, c]: [GymPlan[], GymCoach[]]) => {
        setPlans(p); setCoaches(c);
        if (p.length) setSelectedPlan(p[0].id);
        if (c.length) setCoachId(c[0].id);
      }).catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));

    if (user) {
      gymApi.getMySubs().then(setSubs).catch(() => {});
      gymApi.getMyCoachBookings().then(setCoachBks).catch(() => {});
      loadCheckins();
    }
  }, [user]);

  const subscribe = async () => {
    if (!name || !phone) return toast.error('Nom et téléphone requis');
    if (!selectedPlan)   return toast.error('Choisissez un plan');
    setPlacing(true);
    try {
      const res = await gymApi.subscribe({ plan_id: selectedPlan, customer_name: name, customer_phone: phone, auto_renew: autoRenew });
      const plan = plans.find(p => p.id === selectedPlan);
      setPayData({ id: (res as { id: string }).id, amount: plan?.price ?? 0, type: 'gym', label: plan?.label ?? 'Abonnement' });
      setPayOpen(true);
      gymApi.getMySubs().then(setSubs).catch(() => {});
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setPlacing(false); }
  };

  const doCheckIn = async () => {
    setPlacing(true);
    try {
      await gymApi.checkin();
      toast.success('Présence enregistrée !');
      loadCheckins();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Aucun abonnement actif'); }
    finally { setPlacing(false); }
  };

  const bookCoach = async () => {
    if (!name || !phone) return toast.error('Renseignez vos coordonnées dans l\'onglet abonnement');
    setPlacing(true);
    try {
      const coach = coaches.find(c => c.id === coachId);
      const res = await gymApi.bookCoach({ coach_id: coachId, date: coachDate, hours: coachHours, customer_name: name, customer_phone: phone });
      setPayData({ id: (res as { id: string }).id, amount: (coach?.hour_price ?? 0) * coachHours, type: 'gym_coach', label: `Séance — ${coach?.name ?? 'Coach'} (${coachHours}h)` });
      setPayOpen(true);
      gymApi.getMyCoachBookings().then(setCoachBks).catch(() => {});
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setPlacing(false); }
  };

  const doCancelCoach = async () => {
    if (!cancelCoachId) return;
    setCancelling(true);
    try {
      await gymApi.cancelCoach(cancelCoachId);
      toast.success('Séance annulée');
      setCancelCoachId(null);
      gymApi.getMyCoachBookings().then(setCoachBks).catch(() => {});
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setCancelling(false); }
  };

  const calDays = () => {
    const { y, m } = calMonth;
    const first = (new Date(y, m, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const set = new Set(checkinDates
      .filter(d => { const dt = new Date(d); return dt.getFullYear() === y && dt.getMonth() === m; })
      .map(d => new Date(d).getDate()));
    return { first, daysInMonth, set };
  };

  return (
    <div>
      <ModuleBanner slides={GYM_SLIDES} badge="Salle de sport" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium mb-3">
            <Dumbbell className="w-3.5 h-3.5" /> Salle de sport
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-3">Restez en forme, sans paperasse.</h1>
          <p className="text-muted-foreground max-w-2xl">Abonnement, coach, pointage — tout depuis votre téléphone.</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="abonnement" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="abonnement">Abonnement</TabsTrigger>
              <TabsTrigger value="seance">💪 Séance libre</TabsTrigger>
              <TabsTrigger value="coach">Coach</TabsTrigger>
              <TabsTrigger value="presence">Pointer</TabsTrigger>
              {user && <TabsTrigger value="mes">Mes abonnements ({subs.length})</TabsTrigger>}
            </TabsList>

            {/* SÉANCE LIBRE */}
            <TabsContent value="seance" className="mt-6">
              <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>}>
                <GymSessionBooking />
              </Suspense>
            </TabsContent>

            {/* ABONNEMENT */}
            <TabsContent value="abonnement" className="mt-6">
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">1ère séance coach — <span className="text-emerald-600">OFFERTE</span></div>
                    <div className="text-xs text-muted-foreground">Incluse avec tout nouveau abonnement mensuel ou annuel</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex-shrink-0 ml-3">OFFRE</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {plans.map(p => (
                  <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                    className={`text-left rounded-2xl border-2 p-5 transition ${selectedPlan === p.id ? 'border-primary bg-primary/5 shadow-trust' : 'border-border bg-card hover:border-primary/40'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold">{p.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.days} jour{p.days > 1 ? 's' : ''}</div>
                      </div>
                      {selectedPlan === p.id && <Check className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="font-display text-2xl">{formatPrice(p.price)}</div>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 max-w-xl">
                <h3 className="font-semibold mb-4">Vos informations</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label>Nom complet</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Renouvellement auto</div>
                      <div className="text-xs text-muted-foreground">Reconduit votre abonnement à l'échéance</div>
                    </div>
                    <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
                  </div>
                  {!user && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">Connectez-vous pour vous abonner.</p>}
                  <Button onClick={subscribe} disabled={placing || !user} className="w-full h-12" size="lg">
                    {placing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    S'inscrire — paiement à l'accueil
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* COACH */}
            <TabsContent value="coach" className="mt-6">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {coaches.map((c, idx) => (
                  <button key={c.id} onClick={() => setCoachId(c.id)}
                    className={`text-left rounded-2xl border-2 p-5 transition ${coachId === c.id ? 'border-primary bg-primary/5 shadow-trust' : 'border-border bg-card hover:border-primary/40'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-14 h-14 rounded-2xl text-white font-bold text-xl flex items-center justify-center bg-gradient-to-br ${COACH_GRADIENTS[idx % COACH_GRADIENTS.length]}`}>
                        {c.name.charAt(0)}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">✓ Dispo</span>
                    </div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Dumbbell className="w-3 h-3" /> {c.specialty}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">{formatPrice(c.hour_price)}<span className="text-xs font-normal text-muted-foreground"> / h</span></span>
                      {coachId === c.id && <span className="text-[10px] text-primary font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Choisi</span>}
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 max-w-xl">
                <h3 className="font-semibold mb-4">Choisir un créneau</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" value={coachDate} min={new Date().toISOString().split('T')[0]} onChange={e => setCoachDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Durée</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(h => {
                        const coach = coaches.find(c => c.id === coachId);
                        return (
                          <button key={h} onClick={() => setCoachHours(h)}
                            className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold transition ${coachHours === h ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                            {h}h
                            {coach && <div className="text-[10px] font-normal text-muted-foreground">{formatPrice(coach.hour_price * h)}</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {!user && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">Connectez-vous pour réserver.</p>}
                <Button onClick={bookCoach} disabled={placing || !user} className="w-full h-12" size="lg">
                  {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
                  Réserver — {formatPrice((coaches.find(c => c.id === coachId)?.hour_price ?? 0) * coachHours)}
                </Button>
              </div>

              {coachBks.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold mb-3">Mes séances</h3>
                  <div className="space-y-2">
                    {coachBks.map(b => (
                      <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                        <div>
                          <div className="font-medium text-sm">{b.coach_name} <span className="text-muted-foreground">— {b.date} · {b.hours}h</span></div>
                          <div className="text-xs text-muted-foreground">
                            {formatPrice(b.total)} · {b.status === 'annule' ? <span className="text-destructive">Annulé</span> : <span className="text-emerald-600">Confirmé</span>}
                          </div>
                        </div>
                        {b.status !== 'annule' && (
                          <button onClick={() => setCancelCoachId(b.id)} className="text-xs text-destructive hover:underline flex items-center gap-1">
                            <X className="w-3 h-3" /> Annuler
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* POINTER */}
            <TabsContent value="presence" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><UserCheck className="w-5 h-5 text-primary" /> Pointer ma présence</h3>
                  {!user ? (
                    <p className="text-sm text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">Connectez-vous pour pointer.</p>
                  ) : (
                    <>
                      <Button onClick={doCheckIn} disabled={placing} className="w-full h-12 mb-4" size="lg">
                        {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
                        Pointer maintenant
                      </Button>
                      {checkinCount > 0 && (
                        <p className="text-sm text-center text-muted-foreground">{checkinCount} visite{checkinCount > 1 ? 's' : ''} ce mois</p>
                      )}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Objectif mensuel</span>
                          <span className="font-semibold">{checkinCount}/20</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${checkinCount >= 20 ? 'bg-emerald-500' : checkinCount >= 10 ? 'bg-amber-500' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, checkinCount / 20 * 100)}%` }} />
                        </div>
                        {checkinCount >= 20 && <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1"><Trophy className="w-3 h-3" /> Objectif atteint !</p>}
                      </div>
                    </>
                  )}
                </div>

                {user && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm">Mes présences</h3>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCalMonth(p => { const d = new Date(p.y, p.m - 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
                          className="p-1 hover:bg-muted rounded"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-xs font-medium min-w-[76px] text-center">{MONTH_NAMES[calMonth.m]} {calMonth.y}</span>
                        <button onClick={() => setCalMonth(p => { const d = new Date(p.y, p.m + 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
                          className="p-1 hover:bg-muted rounded"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {(() => {
                      const { first, daysInMonth, set } = calDays();
                      const cells: React.ReactNode[] = [];
                      for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} />);
                      for (let d = 1; d <= daysInMonth; d++) {
                        const checked = set.has(d);
                        cells.push(
                          <div key={d} className={`aspect-square flex items-center justify-center rounded-full text-xs font-medium ${checked ? 'bg-emerald-500 text-white' : 'text-muted-foreground'}`}>{d}</div>
                        );
                      }
                      return (
                        <>
                          <div className="grid grid-cols-7 gap-0.5 mb-1">
                            {['L','M','M','J','V','S','D'].map((d, i) => (
                              <div key={i} className="text-center text-[9px] font-semibold text-muted-foreground">{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-0.5">{cells}</div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {user && (
                <div className="rounded-2xl border border-border bg-card p-6 mt-4">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" /> Activité — 12 dernières semaines
                  </h3>
                  <CheckinHeatmap dates={checkinDates} />
                </div>
              )}
            </TabsContent>

            {/* MES ABONNEMENTS */}
            {user && (
              <TabsContent value="mes" className="mt-6">
                {subs.length === 0 ? (
                  <p className="text-muted-foreground">Aucun abonnement.</p>
                ) : (
                  <div className="space-y-3">
                    {subs.map(s => {
                      const daysLeft = Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000);
                      const isActive = s.status === 'active' && daysLeft > 0;
                      const totalDays = Math.ceil((new Date(s.end_date).getTime() - new Date(s.start_date).getTime()) / 86400000);
                      const pct = totalDays > 0 ? Math.max(0, Math.min(100, Math.round(daysLeft / totalDays * 100))) : 0;
                      return (
                        <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="font-semibold">{s.customer_name ?? user.fullname}</div>
                              <div className="text-sm text-muted-foreground">{s.plan_label} — expire le {new Date(s.end_date).toLocaleDateString('fr-FR')}</div>
                              {s.auto_renew && <div className="text-xs text-primary flex items-center gap-1 mt-1"><RefreshCw className="w-3 h-3" /> Renouvellement auto</div>}
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatPrice(s.price)}</div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/15 text-emerald-700' : 'bg-red-500/15 text-red-700'}`}>
                                {isActive ? `${daysLeft}j restants` : 'Expiré'}
                              </span>
                            </div>
                          </div>
                          {isActive && (
                            <div>
                              <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Progression</span><span>{pct}%</span></div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      <Dialog open={!!cancelCoachId} onOpenChange={o => !o && setCancelCoachId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Annuler la séance coach ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelCoachId(null)}>Non</Button>
            <Button variant="destructive" className="flex-1" disabled={cancelling} onClick={doCancelCoach}>
              {cancelling && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Oui, annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {payData && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setPayData(null); toast.success('Paiement confirmé !'); }}
          amount={payData.amount}
          bookingType={payData.type}
          bookingId={payData.id}
          label={payData.label}
        />
      )}
    </div>
  );
};

export default ClientGym;
