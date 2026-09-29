import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { cybercafeApi } from '@/api/bookings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
const CybercafeStations = lazy(() => import('../components/CybercafeStations'));
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, Monitor, Loader2, Check, RefreshCw, BellRing, X, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/client/lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from '../components/PaymentModal';
import ModuleBanner from '../components/ModuleBanner';
import { CYBERCAFE_SLIDES } from '../lib/bannerSlides';

interface Station { id: string; number: number; specs: string; available?: boolean; }
interface Duration { id: string; label: string; minutes: number; price: number; }
interface CyberService { id: string; label: string; price: number; unit: string; }
interface Session {
  id: string; station_number: number; duration_label: string; total: number;
  status: string; start_time: string; end_time: string; customer_name: string | null;
  duration_price: number; services_total: number;
}
interface WaitEntry { id: string; station_id: string | null; station_number?: number; created_at: string; }

function useCountdown(endTime: string | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endTime) return;
    const tick = () => setRemaining(Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endTime]);
  return remaining;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function CountdownBadge({ endTime }: { endTime: string }) {
  const rem = useCountdown(endTime);
  const pct = (() => {
    const end = new Date(endTime).getTime();
    return 0; // simplified — no start_time in props
    return Math.max(0, Math.min(100, rem > 0 ? 100 : 0));
  })();
  const color = rem > 600 ? 'text-emerald-600' : rem > 120 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className={`font-mono text-xl font-bold ${color} flex items-center gap-2`}>
      <Timer className="w-5 h-5" />
      {rem > 0 ? formatDuration(rem) : <span className="text-muted-foreground">Terminé</span>}
    </div>
  );
}

const ClientCybercafe = () => {
  const { user } = useClientAuth();

  const [stations, setStations] = useState<Station[]>([]);
  const [durations, setDurations] = useState<Duration[]>([]);
  const [services, setServices] = useState<CyberService[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [waitlist, setWaitlist] = useState<WaitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState(user?.fullname ?? '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone ?? '');
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payData, setPayData] = useState<{ id: string; amount: number } | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const [st, dr, sv, avail] = await Promise.all([
        cybercafeApi.getStations(),
        cybercafeApi.getDurations(),
        cybercafeApi.getServices(),
        cybercafeApi.getAvail(today),
      ]);
      const availIds = new Set((avail as Station[]).filter(s => s.available).map(s => s.id));
      setStations((st as Station[]).map(s => ({ ...s, available: availIds.has(s.id) })));
      setDurations(dr as Duration[]);
      setServices(sv as CyberService[]);
      if ((dr as Duration[]).length && !selectedDuration) setSelectedDuration((dr as Duration[])[0].id);
      if (user) {
        const [sessions, wl] = await Promise.all([
          cybercafeApi.getMySessions(),
          cybercafeApi.getWaitlist(),
        ]);
        setMySessions(sessions as Session[]);
        setWaitlist(wl as WaitEntry[]);
      }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    // Auto-refresh toutes les 60s
    intervalRef.current = setInterval(load, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const toggleService = (id: string) =>
    setSelectedServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleBook = async () => {
    if (!customerName || !customerPhone || !selectedStation || !selectedDuration) {
      toast.error('Remplissez tous les champs et choisissez un poste'); return;
    }
    setPlacing(true);
    try {
      const res = await cybercafeApi.book({
        station_id: selectedStation,
        duration_id: selectedDuration,
        services: selectedServices,
        customer_name: customerName,
        customer_phone: customerPhone,
      });
      setSelectedStation(null); setSelectedServices([]);
      setPayData({ id: (res as { id: string }).id, amount: total });
      setPayOpen(true);
      await load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setPlacing(false); }
  };

  const completeSession = async (id: string) => {
    try {
      await cybercafeApi.complete(id);
      toast.success('Session terminée');
      await load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
  };

  const joinWaitlist = async (stationId?: string) => {
    setJoining(stationId ?? 'any');
    try {
      await cybercafeApi.joinWaitlist(stationId);
      toast.success('Ajouté à la liste d\'attente — vous serez notifié quand un poste se libère');
      await load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Déjà en liste d\'attente'); }
    finally { setJoining(null); }
  };

  const leaveWaitlist = async (id: string) => {
    try {
      await cybercafeApi.leaveWaitlist(id);
      toast.success('Retiré de la liste d\'attente');
      await load();
    } catch { toast.error('Erreur'); }
  };

  const selectedDur   = durations.find(d => d.id === selectedDuration);
  const selectedSvcs  = services.filter(s => selectedServices.includes(s.id));
  const total         = (selectedDur?.price ?? 0) + selectedSvcs.reduce((s, sv) => s + sv.price, 0);
  const activeSessions    = mySessions.filter(s => s.status === 'active');
  const completedSessions = mySessions.filter(s => s.status === 'completed');
  const allOccupied = stations.length > 0 && stations.every(s => !s.available);
  const inWaitlist = waitlist.length > 0;

  return (
    <div>
      <ModuleBanner slides={CYBERCAFE_SLIDES} badge="Cybercafé" />
      <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between flex-wrap gap-4 mb-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-xs font-medium mb-3">
              <Monitor className="w-3.5 h-3.5" /> Cybercafé
            </div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-2">Connectez-vous. Créez.</h1>
            <p className="text-muted-foreground max-w-2xl">Postes haute performance, internet fibre, services additionnels.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Rafraîchir</Button>
        </motion.div>

        <Tabs defaultValue="plan" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plan">🖥️ Plan des postes</TabsTrigger>
            <TabsTrigger value="classique">⏱️ Réservation horaire</TabsTrigger>
            {user && mySessions.length > 0 && <TabsTrigger value="mes">Mes sessions ({mySessions.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="plan" className="mt-0">
            <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground"/></div>}>
              <CybercafeStations />
            </Suspense>
          </TabsContent>

          <TabsContent value="classique">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Bannière liste d'attente active */}
            {inWaitlist && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                  <BellRing className="w-4 h-4 flex-shrink-0" />
                  Vous êtes en liste d'attente — nous vous notifierons dès qu'un poste se libère.
                </div>
                <button onClick={() => leaveWaitlist(waitlist[0].id)} className="text-amber-600 hover:text-amber-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Occupancy strip */}
            {stations.length > 0 && (
              <div className="flex items-center gap-5 rounded-2xl border border-border bg-card p-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">
                      {stations.filter(s => s.available).length} poste{stations.filter(s => s.available).length !== 1 ? 's' : ''} libre{stations.filter(s => s.available).length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">sur {stations.length}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      stations.filter(s => !s.available).length / stations.length > 0.7 ? 'bg-red-500' :
                      stations.filter(s => !s.available).length / stations.length > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} style={{ width: `${Math.round(stations.filter(s => !s.available).length / stations.length * 100)}%` }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-primary">{Math.round(stations.filter(s => !s.available).length / stations.length * 100)}%</div>
                  <div className="text-xs text-muted-foreground">occupation</div>
                </div>
              </div>
            )}

            {/* Stations */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Choisissez votre poste</h2>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {stations.map(station => (
                  <div key={station.id} role="button" tabIndex={station.available ? 0 : -1}
                    onClick={() => station.available && setSelectedStation(station.id)}
                    onKeyDown={e => e.key === 'Enter' && station.available && setSelectedStation(station.id)}
                    className={`rounded-2xl border-2 p-4 transition ${
                      !station.available
                        ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 cursor-not-allowed'
                        : selectedStation === station.id
                          ? 'border-primary bg-primary/5 shadow-trust cursor-pointer'
                          : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20 hover:border-emerald-400 cursor-pointer'
                    }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${station.available ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        <Monitor className={`w-5 h-5 ${station.available ? 'text-emerald-600' : 'text-red-500'}`} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${station.available ? 'bg-emerald-500/15 text-emerald-700' : 'bg-red-500/15 text-red-600'}`}>
                        {station.available ? 'LIBRE' : 'OCCUPÉ'}
                      </span>
                    </div>
                    <div className="font-bold">Poste {station.number}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{station.specs}</div>
                    {selectedStation === station.id && (
                      <div className="mt-2 text-xs text-primary font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Sélectionné</div>
                    )}
                    {!station.available && user && !inWaitlist && (
                      <button onClick={e => { e.stopPropagation(); joinWaitlist(station.id); }}
                        disabled={joining === station.id}
                        className="mt-2 w-full text-xs flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition">
                        {joining === station.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellRing className="w-3 h-3" />}
                        Attendre ce poste
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Bouton "n'importe quel poste" si tous occupés */}
              {allOccupied && user && !inWaitlist && (
                <Button variant="outline" className="gap-2" disabled={joining === 'any'} onClick={() => joinWaitlist()}>
                  {joining === 'any' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                  Me mettre en attente — n'importe quel poste
                </Button>
              )}
            </div>

            {/* Booking form */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Monitor className="w-5 h-5 text-violet-600" /> Nouvelle réservation</h3>
              <div className="grid gap-4 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Nom</label>
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Téléphone</label>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Durée</label>
                  <div className="grid gap-2">
                    {durations.map(dur => (
                      <Button key={dur.id} variant={selectedDuration === dur.id ? 'default' : 'outline'}
                        className="justify-between h-auto p-3"
                        onClick={() => setSelectedDuration(dur.id)}>
                        <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{dur.label}</span>
                        <span className="font-semibold">{formatPrice(dur.price)}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {services.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Services additionnels (optionnel)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {services.map(svc => (
                        <button key={svc.id} onClick={() => toggleService(svc.id)}
                          className={`text-left p-3 rounded-xl border-2 text-sm transition ${selectedServices.includes(svc.id) ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
                          <div className="font-medium">{svc.label}</div>
                          <div className="text-xs text-muted-foreground">{formatPrice(svc.price)} / {svc.unit}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-muted-foreground">Total estimé :</span>
                <span className="font-bold text-lg">{formatPrice(total)}</span>
              </div>

              {!user && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">Vous devez être connecté pour réserver.</p>}
              <Button onClick={handleBook} disabled={placing || !selectedStation || !user} size="lg" className="w-full h-12">
                {placing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Réserver{selectedStation ? ` Poste ${stations.find(s => s.id === selectedStation)?.number}` : ''}
              </Button>
            </div>

            {/* Sessions actives avec countdown */}
            {activeSessions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" /> Session en cours
                </h2>
                {activeSessions.map(session => (
                  <div key={session.id} className="rounded-2xl border-2 border-primary bg-primary/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-semibold">{session.customer_name} — <span className="text-primary">Poste {session.station_number}</span></div>
                        <div className="text-sm text-muted-foreground">{session.duration_label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Fin prévue : {new Date(session.end_time).toLocaleTimeString('fr-FR')}</div>
                        <div className="mt-3">
                          <CountdownBadge endTime={session.end_time} />
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="font-bold text-xl">{formatPrice(session.total)}</div>
                        <Button size="sm" variant="outline" onClick={() => completeSession(session.id)}>Terminer la session</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sessions complétées */}
            {completedSessions.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-muted-foreground">Sessions passées</h2>
                {completedSessions.slice(0, 5).map(session => (
                  <div key={session.id} className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3 opacity-70">
                    <div>
                      <div className="font-medium text-sm">{session.customer_name} — Poste {session.station_number}</div>
                      <div className="text-xs text-muted-foreground">{new Date(session.start_time).toLocaleString('fr-FR')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{formatPrice(session.total)}</div>
                      <div className="text-[10px] text-muted-foreground">Complétée</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {payData && (
          <PaymentModal
            open={payOpen}
            onClose={() => setPayOpen(false)}
            onSuccess={() => { setPayOpen(false); setPayData(null); toast.success('Session cybercafé payée !'); }}
            amount={payData.amount}
            bookingType="cybercafe"
            bookingId={payData.id}
            label="Session Cybercafé — ARENAH"
          />
        )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientCybercafe;
