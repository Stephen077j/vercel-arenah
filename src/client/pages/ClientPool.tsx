import { useEffect, useState, lazy, Suspense } from 'react';
const PoolDirectEntry = lazy(() => import('../components/PoolDirectEntry'));
import { motion } from 'framer-motion';
import { Waves, Check, Calendar, AlertCircle, Loader2, QrCode, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { poolApi } from '@/api/bookings';
import { formatPrice } from '@/client/lib/clientStore';
import { useClientAuth } from '../lib/clientAuth';
import PaymentModal from '../components/PaymentModal';
import ModuleBanner from '../components/ModuleBanner';
import { POOL_SLIDES } from '../lib/bannerSlides';

interface PassType { id: string; label: string; price: number; entries: number; validity_days: number; }
interface MyPass   { id: string; pass_label: string; entries_left: number; expires_at: string; price: number; }
interface CourseItem { id: string; name: string; instructor: string | null; price: number; slots: string[]; max_students: number; }
interface MyCourse { id: string; course_name: string; instructor: string | null; date: string; slot: string; price: number; status: string; }

const OPENING_HOURS = [
  { day: 'Lundi – Vendredi', hours: '06:00 – 21:00' },
  { day: 'Samedi',           hours: '07:00 – 20:00' },
  { day: 'Dimanche',         hours: '08:00 – 18:00' },
];

const ClientPool = () => {
  const { user } = useClientAuth();

  const [passTypes, setPassTypes]   = useState<PassType[]>([]);
  const [myPasses, setMyPasses]     = useState<MyPass[]>([]);
  const [myCourses, setMyCourses]   = useState<MyCourse[]>([]);
  const [courses, setCourses]       = useState<CourseItem[]>([]);
  const [loading, setLoading]       = useState(true);

  const [name, setName]             = useState(user?.fullname ?? '');
  const [phone, setPhone]           = useState(user?.phone ?? '');
  const [passId, setPassId]         = useState('');
  const [courseId, setCourseId]     = useState('');
  const [slot, setSlot]             = useState('');
  const [courseDate, setCourseDate] = useState(new Date().toISOString().split('T')[0]);
  const [placing, setPlacing]       = useState(false);
  const [payOpen, setPayOpen]       = useState(false);
  const [payData, setPayData]       = useState<{ id: string; amount: number; type: 'pool' | 'pool_course'; label: string } | null>(null);

  // Disponibilité cours
  const [slotAvail, setSlotAvail]   = useState<Record<string, { enrolled: number; available: boolean }>>({});

  // QR dialog
  const [qrOpen, setQrOpen]       = useState(false);
  const [qrData, setQrData]       = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const loadPasses  = () => poolApi.getMyPasses().then(p => setMyPasses(p as MyPass[])).catch(() => {});
  const loadCourses = () => poolApi.getMyCourses().then(c => setMyCourses(c as MyCourse[])).catch(() => {});

  useEffect(() => {
    Promise.all([
      poolApi.getPassTypes(),
      poolApi.getCoursesCatalog(),
    ]).then(([pts, cats]) => {
      const p = pts as PassType[];
      const c = cats as CourseItem[];
      setPassTypes(p);
      if (p.length) setPassId(p[0].id);
      setCourses(c);
      if (c.length) { setCourseId(c[0].id); if (c[0].slots.length) setSlot(c[0].slots[0]); }
    }).catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
    if (user) { loadPasses(); loadCourses(); }
  }, [user]);

  // Check disponibilité du créneau sélectionné
  useEffect(() => {
    if (!courseId || !slot || !courseDate) return;
    poolApi.getCourseAvail(courseId, courseDate, slot)
      .then(d => {
        const r = d as { enrolled: number; available: boolean };
        setSlotAvail(prev => ({ ...prev, [`${courseId}_${courseDate}_${slot}`]: r }));
      })
      .catch(() => {});
  }, [courseId, courseDate, slot]);

  const selectedCourse = courses.find(c => c.id === courseId);
  const availKey = `${courseId}_${courseDate}_${slot}`;
  const slotInfo = slotAvail[availKey];
  const placesLeft = (slotInfo && selectedCourse) ? selectedCourse.max_students - slotInfo.enrolled : null;

  const buy = async () => {
    if (!name || !phone) return toast.error('Nom et téléphone requis');
    setPlacing(true);
    try {
      const res = await poolApi.buyPass({ pass_type_id: passId, customer_name: name, customer_phone: phone });
      const pObj = passTypes.find(p => p.id === passId);
      setPayData({ id: (res as { id: string }).id, amount: pObj?.price ?? 0, type: 'pool', label: pObj?.label ?? 'Pass piscine' });
      setPayOpen(true); loadPasses();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setPlacing(false); }
  };

  const bookCourse = async () => {
    if (!name || !phone) return toast.error('Nom et téléphone requis');
    if (!slot) return toast.error('Choisissez un créneau');
    if (slotInfo && !slotInfo.available) return toast.error('Cours complet pour ce créneau');
    setPlacing(true);
    try {
      const res = await poolApi.bookCourse({ course_id: courseId, date: courseDate, slot, customer_name: name, customer_phone: phone });
      setPayData({ id: (res as { id: string }).id, amount: selectedCourse?.price ?? 0, type: 'pool_course', label: selectedCourse?.name ?? 'Cours piscine' });
      setPayOpen(true); loadCourses();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setPlacing(false); }
  };

  const cancelCourse = async (id: string) => {
    try { await poolApi.cancelCourse(id); toast.success('Cours annulé'); loadCourses(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
  };

  const usePassEntry = async (pid: string) => {
    try { await poolApi.useEntry(pid); toast.success('Entrée validée !'); loadPasses(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
  };

  const showQr = async (pid: string) => {
    setQrData(null); setQrOpen(true); setQrLoading(true);
    try {
      const res = await poolApi.getPassQr(pid) as { qr_data_url: string };
      setQrData(res.qr_data_url);
    } catch { toast.error('Erreur génération QR'); setQrOpen(false); }
    finally { setQrLoading(false); }
  };

  return (
    <div>
      <ModuleBanner slides={POOL_SLIDES} badge="Piscine" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 text-xs font-medium mb-3">
            <Waves className="w-3.5 h-3.5" /> Piscine
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-3">Plongez quand vous voulez.</h1>
          <p className="text-muted-foreground max-w-2xl">Forfaits, cours collectifs, QR code pour l'entrée. Tout en un endroit.</p>
        </motion.div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-sky-500/5 border border-sky-500/20 p-4 text-center">
            <div className="text-2xl font-bold text-sky-600">28°C</div>
            <div className="text-xs text-muted-foreground mt-0.5">Température eau</div>
          </div>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {user
                ? myPasses.some(p => p.entries_left === 999 && new Date(p.expires_at) >= new Date())
                  ? '∞'
                  : myPasses.filter(p => new Date(p.expires_at) >= new Date()).reduce((s, p) => s + p.entries_left, 0)
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Entrées restantes</div>
          </div>
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4 text-center">
            <div className="text-2xl font-bold text-violet-600">{courses.length || '—'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Cours dispo</div>
          </div>
        </div>

        {/* Horaires d'ouverture */}
        <div className="rounded-2xl border border-sky-200/30 bg-sky-500/5 p-5 mb-8 max-w-xl">
          <div className="flex items-center gap-2 text-sky-600 font-semibold mb-3 text-sm">
            <Clock className="w-4 h-4" /> Horaires d'ouverture
          </div>
          <div className="space-y-1.5">
            {OPENING_HOURS.map(h => (
              <div key={h.day} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{h.day}</span>
                <span className="font-medium">{h.hours}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="forfaits">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="entree">🏊 Entrée directe</TabsTrigger>
              <TabsTrigger value="forfaits">Forfaits</TabsTrigger>
              <TabsTrigger value="cours">Cours</TabsTrigger>
              {user && <TabsTrigger value="mes">Mes forfaits ({myPasses.length})</TabsTrigger>}
            </TabsList>

            {/* ENTRÉE DIRECTE */}
            <TabsContent value="entree" className="mt-6">
              <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>}>
                <PoolDirectEntry />
              </Suspense>
            </TabsContent>

            {/* FORFAITS */}
            <TabsContent value="forfaits" className="mt-6">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {passTypes.map(p => (
                  <button key={p.id} onClick={() => setPassId(p.id)}
                    className={`text-left rounded-2xl border-2 p-5 transition ${passId === p.id ? 'border-primary bg-primary/5 shadow-trust' : 'border-border bg-card hover:border-primary/40'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold">{p.label}</div>
                      {passId === p.id && <Check className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">Valable {p.validity_days} jour(s)</div>
                    <div className="font-display text-2xl">{formatPrice(p.price)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{p.entries === 999 ? 'Illimité' : `${p.entries} entrée(s)`}</div>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 max-w-xl">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5"><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                </div>
                {!user && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">Connectez-vous pour acheter.</p>}
                <Button onClick={buy} disabled={placing || !user} className="w-full h-12" size="lg">
                  {placing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Acheter — paiement à l'accueil
                </Button>
              </div>
            </TabsContent>

            {/* COURS */}
            <TabsContent value="cours" className="mt-6">
              {courses.length === 0 ? (
                <p className="text-muted-foreground">Aucun cours disponible pour le moment.</p>
              ) : (
                <>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    {courses.map(c => (
                      <button key={c.id} onClick={() => { setCourseId(c.id); setSlot(c.slots[0] ?? ''); }}
                        className={`text-left rounded-2xl border-2 p-5 transition ${courseId === c.id ? 'border-primary bg-primary/5 shadow-trust' : 'border-border bg-card hover:border-primary/40'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                            <Waves className="w-5 h-5 text-sky-600" />
                          </div>
                          {courseId === c.id && <Check className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="font-semibold">{c.name}</div>
                        {c.instructor && (
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {c.instructor.charAt(0)}
                            </span>
                            Coach {c.instructor}
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-1 flex-wrap">
                          {Array.from({ length: Math.min(c.max_students, 8) }).map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-sky-400/40" />
                          ))}
                          {c.max_students > 8 && <span className="text-[9px] text-muted-foreground">+{c.max_students - 8}</span>}
                          <span className="text-[10px] text-muted-foreground ml-1">{c.max_students} places</span>
                        </div>
                        <div className="text-sm font-bold text-primary mt-2">{formatPrice(c.price)}</div>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-6 max-w-xl">
                    <div className="space-y-1.5 mb-3">
                      <Label>Date</Label>
                      <Input type="date" value={courseDate} onChange={e => setCourseDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <Label className="mb-2 block">Créneau</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(selectedCourse?.slots ?? []).map(s => (
                        <button key={s} onClick={() => setSlot(s)}
                          className={`px-4 py-2 rounded-lg text-sm border transition ${slot === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    {/* Places restantes */}
                    {slot && slotInfo !== undefined && (
                      <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${slotInfo.available ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-600'}`}>
                        {slotInfo.available
                          ? `${placesLeft} place${placesLeft !== 1 ? 's' : ''} restante${placesLeft !== 1 ? 's' : ''}`
                          : 'Cours complet pour ce créneau'}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1.5"><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                    </div>
                    {!user && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">Connectez-vous pour réserver.</p>}
                    <Button onClick={bookCourse} disabled={placing || !user || !!(slotInfo && !slotInfo.available)} className="w-full h-12" size="lg">
                      {placing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      <Calendar className="w-4 h-4 mr-2" /> Réserver
                    </Button>

                    {myCourses.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold mb-3">Mes cours</h3>
                        <div className="space-y-2">
                          {myCourses.map(b => (
                            <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                              <div>
                                <div className="font-medium text-sm">{b.course_name} <span className="text-muted-foreground">— {b.date} · {b.slot}</span></div>
                                <div className="text-xs text-muted-foreground">{b.instructor && `Coach ${b.instructor} · `}{formatPrice(b.price)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'annule' ? 'bg-destructive/20 text-destructive' : 'bg-emerald-500/20 text-emerald-600'}`}>
                                  {b.status === 'annule' ? 'Annulé' : 'Confirmé'}
                                </span>
                                {b.status !== 'annule' && (
                                  <button onClick={() => cancelCourse(b.id)} className="text-muted-foreground hover:text-destructive">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* MES FORFAITS */}
            {user && (
              <TabsContent value="mes" className="mt-6">
                {myPasses.length === 0 ? <p className="text-muted-foreground">Aucun forfait actif.</p> : (
                  <div className="space-y-3">
                    {myPasses.map(p => {
                      const lowAlert = p.entries_left <= 2 && p.entries_left > 0;
                      const expired  = new Date(p.expires_at) < new Date();
                      return (
                        <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">{p.pass_label}</div>
                              <div className="text-sm text-muted-foreground">Expire le {new Date(p.expires_at).toLocaleDateString('fr-FR')}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">{p.entries_left === 999 ? '∞' : p.entries_left}</div>
                              <div className="text-xs text-muted-foreground">entrée(s)</div>
                            </div>
                          </div>
                          {lowAlert && !expired && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                              <AlertCircle className="w-3.5 h-3.5" /> Plus que {p.entries_left} entrée(s), pensez à renouveler.
                            </div>
                          )}
                          {!expired && p.entries_left > 0 && (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" variant="outline" onClick={() => usePassEntry(p.id)}>
                                <Check className="w-3.5 h-3.5 mr-1" /> Valider une entrée
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => showQr(p.id)}>
                                <QrCode className="w-3.5 h-3.5 mr-1" /> QR Code
                              </Button>
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

      {/* Dialog QR */}
      <Dialog open={qrOpen} onOpenChange={o => !o && setQrOpen(false)}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader><DialogTitle><QrCode className="w-4 h-4 inline mr-2" />QR Pass piscine</DialogTitle></DialogHeader>
          {qrLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : qrData ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <img src={qrData} alt="QR code du pass" className="rounded-xl border border-border" width={250} />
              <p className="text-xs text-muted-foreground">Présentez ce QR code à l'accueil.</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {payData && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={() => { setPayOpen(false); setPayData(null); toast.success('Paiement piscine confirmé !'); }}
          amount={payData.amount}
          bookingType={payData.type}
          bookingId={payData.id}
          label={payData.label}
        />
      )}
    </div>
  );
};

export default ClientPool;
