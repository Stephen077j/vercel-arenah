import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Baby, Calendar, Clock, Users, Star, Shield, ChevronRight, Loader2, PartyPopper, Gamepad2, Palette, Drumstick, Bike } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useClientAuth } from '../lib/clientAuth';
import ModuleBanner from '../components/ModuleBanner';
import { ENFANTS_SLIDES } from '../lib/bannerSlides';
import { formatPrice } from '../lib/clientStore';

interface TicketType {
  id: string; label: string; price: number; duration_hours: number; per_person: boolean;
}
interface Booking {
  id: string; booking_type: string; visit_date: string; num_children: number;
  num_adults: number; duration_hours: number; package_label: string;
  total_price: number; status: string; created_at: string;
}

const ACTIVITIES = [
  { icon: Bike,         label: 'Trampoline',      desc: 'Sauts en toute sécurité' },
  { icon: Gamepad2,     label: 'Jeux vidéo',      desc: 'Consoles et bornes arcade' },
  { icon: Palette,      label: 'Atelier créatif',  desc: 'Peinture, dessin, modelage' },
  { icon: PartyPopper,  label: 'Château gonflable', desc: 'Glisse et escalade' },
  { icon: Drumstick,    label: 'Coin dînette',     desc: 'Cuisine et jeux de rôle' },
  { icon: Baby,         label: 'Bébés (0–3 ans)',  desc: 'Espace sécurisé en mousse' },
];

const GALLERY = [
  { url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=500&q=80&auto=format&fit=crop', cap: 'Espace jeux' },
  { url: 'https://images.unsplash.com/photo-1526634332515-d56c5fd16991?w=500&q=80&auto=format&fit=crop', cap: 'Trampoline' },
  { url: 'https://images.unsplash.com/photo-1565538421519-b5c0e4fd7a3e?w=500&q=80&auto=format&fit=crop', cap: 'Atelier créatif' },
  { url: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=500&q=80&auto=format&fit=crop', cap: 'Anniversaire' },
];

const ClientEnfants = () => {
  const { user } = useClientAuth();
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [myBookings, setMyBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]         = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<string>('child_1h');
  const [visitDate,      setVisitDate]       = useState('');
  const [numChildren,    setNumChildren]     = useState(1);
  const [numAdults,      setNumAdults]       = useState(1);
  const [notes,          setNotes]           = useState('');
  const [placing,        setPlacing]         = useState(false);

  const token = localStorage.getItem('arenah_token');

  useEffect(() => {
    fetch('/api/bookings/kids/ticket-types')
      .then(r => r.json()).then(setTicketTypes).catch(() => {});
    if (user && token) {
      fetch('/api/bookings/kids/my', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setMyBookings(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [user, token]);

  const ticket = ticketTypes.find(t => t.id === selectedTicket);
  const estimatedTotal = ticket
    ? ticket.per_person
      ? ticket.price * numChildren + (selectedTicket !== 'birthday_pack' ? 1000 * numAdults : 0)
      : ticket.price
    : 0;

  const handleBook = async () => {
    if (!user) { toast.error('Connectez-vous pour réserver'); return; }
    if (!visitDate) { toast.error('Choisissez une date de visite'); return; }
    setPlacing(true);
    try {
      const r = await fetch('/api/bookings/kids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticket_type_id: selectedTicket, visit_date: visitDate, num_children: numChildren, num_adults: numAdults, notes }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erreur');
      setMyBookings(prev => [data, ...prev]);
      toast.success('Réservation confirmée ! À bientôt 🧸');
      setVisitDate(''); setNotes('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally { setPlacing(false); }
  };

  return (
    <div>
      <ModuleBanner slides={ENFANTS_SLIDES} badge="Espace Enfants" ctaLabel="Réserver" ctaHref="#reserver" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 mb-3">
              <Baby className="w-3.5 h-3.5" /> Espace Enfants
            </div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight mb-2">Arenah Kids Space 🧸</h1>
            <p className="text-muted-foreground max-w-xl">
              Un espace de jeux sécurisé pensé pour les enfants de <strong>2 à 12 ans</strong>.
              Trampolines, jeux vidéo, ateliers créatifs, fêtes d'anniversaire — la bonne humeur garantie !
            </p>
          </div>
        </motion.div>

        {/* ── Activités ──────────────────────────────────────────────── */}
        <section>
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-pink-500" /> Nos activités
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ACTIVITIES.map(a => (
              <div key={a.label} className="rounded-2xl border border-border bg-card p-4 text-center hover:border-pink-500/40 hover:bg-pink-500/5 transition">
                <a.icon className="w-7 h-7 mx-auto text-pink-500 mb-2" />
                <div className="font-semibold text-sm">{a.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Galerie ────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-amber-500" /> Aperçu de l'espace
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {GALLERY.map(g => (
              <div key={g.url} className="flex-shrink-0 w-52 rounded-xl overflow-hidden border border-border group">
                <div className="h-36 overflow-hidden">
                  <img src={g.url} alt={g.cap} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-2 text-xs text-muted-foreground text-center">{g.cap}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tarifs + Formulaire ────────────────────────────────────── */}
        <section id="reserver" className="grid lg:grid-cols-5 gap-6">

          {/* Tarifs */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-semibold text-lg mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Tarifs
            </h2>
            {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
            {ticketTypes.map(t => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTicket(t.id)}
                onKeyDown={e => e.key === 'Enter' && setSelectedTicket(t.id)}
                className={`rounded-2xl border-2 p-4 cursor-pointer transition select-none ${
                  selectedTicket === t.id
                    ? 'border-primary bg-primary/5 shadow-trust'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm">{t.label}</div>
                    {t.duration_hours > 0 && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {t.duration_hours}h
                        {t.per_person && ' · par enfant'}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-primary whitespace-nowrap">{formatPrice(t.price)}</div>
                </div>
                {selectedTicket === t.id && (
                  <div className="mt-2 text-[11px] text-primary font-semibold flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" /> Sélectionné
                  </div>
                )}
              </div>
            ))}

            {/* Info pratiques */}
            <div className="rounded-2xl border border-border bg-card p-4 mt-2 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Lun–Dim · <strong className="text-foreground">09h00 – 18h00</strong></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Baby className="w-4 h-4 text-pink-500 flex-shrink-0" />
                <span>Enfants de <strong className="text-foreground">2 à 12 ans</strong></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Espace surveillé · Animateurs qualifiés</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Route vers Anjomakely, Ivato</span>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 space-y-5">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Réserver une visite
            </h2>

            <div>
              <label className="block text-sm font-medium mb-1.5">Date de visite</label>
              <Input
                type="date"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre d'enfants</label>
                <Input
                  type="number" min={1} max={30}
                  value={numChildren}
                  onChange={e => setNumChildren(Math.max(1, Number(e.target.value)))}
                  className="h-11"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Adultes accompagnateurs</label>
                <Input
                  type="number" min={0} max={10}
                  value={numAdults}
                  onChange={e => setNumAdults(Math.max(0, Number(e.target.value)))}
                  className="h-11"
                />
              </div>
            </div>

            {selectedTicket === 'birthday_pack' && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Prénom de l'enfant fêté · Message (facultatif)</label>
                <Input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex : Anniversaire de Lucas, thème dinosaures…"
                  className="h-11"
                />
              </div>
            )}

            {/* Total estimé */}
            {ticket && (
              <div className="rounded-xl bg-pink-500/5 border border-pink-500/20 p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {ticket.per_person
                    ? `${formatPrice(ticket.price)} × ${numChildren} enfant${numChildren > 1 ? 's' : ''}${selectedTicket !== 'birthday_pack' ? ` + ${formatPrice(1000)} × ${numAdults} adulte${numAdults > 1 ? 's' : ''}` : ''}`
                    : ticket.label
                  }
                </div>
                <div className="font-bold text-xl text-primary">{formatPrice(estimatedTotal)}</div>
              </div>
            )}

            <Button
              onClick={handleBook}
              disabled={placing || !user || !visitDate}
              size="lg"
              className="w-full h-12"
            >
              {placing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {user ? 'Confirmer la réservation' : 'Connectez-vous pour réserver'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Paiement sur place à l'arrivée · Annulation gratuite 2h avant
            </p>
          </div>
        </section>

        {/* ── Mes réservations ───────────────────────────────────────── */}
        {myBookings.length > 0 && (
          <section>
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Baby className="w-5 h-5 text-primary" /> Mes visites
            </h2>
            <div className="space-y-3">
              {myBookings.map(b => (
                <div key={b.id} className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${
                  b.status === 'confirmed' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card opacity-70'
                }`}>
                  <div className="flex-1">
                    <div className="font-semibold">{b.package_label}</div>
                    <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(b.visit_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {b.num_children} enfant{b.num_children > 1 ? 's' : ''}{b.num_adults > 0 ? ` + ${b.num_adults} adulte${b.num_adults > 1 ? 's' : ''}` : ''}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg">{formatPrice(b.total_price)}</div>
                    <div className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${b.status === 'confirmed' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {b.status === 'confirmed' ? '✓ Confirmée' : b.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Pack Anniversaire CTA ──────────────────────────────────── */}
        <section className="rounded-2xl bg-gradient-to-r from-pink-500/10 to-amber-500/10 border border-pink-500/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="text-4xl">🎂</div>
          <div className="flex-1">
            <h3 className="font-bold text-xl mb-1">Organisez un anniversaire mémorable</h3>
            <p className="text-muted-foreground text-sm">
              Salle décorée, gâteau, animation et surveillance inclus — jusqu'à 15 enfants.
              Décorations à thème disponibles sur demande.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-pink-500/40 text-pink-600 hover:bg-pink-500/10 whitespace-nowrap"
            onClick={() => { setSelectedTicket('birthday_pack'); document.getElementById('reserver')?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            Réserver le pack <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </section>

      </div>
    </div>
  );
};

export default ClientEnfants;
