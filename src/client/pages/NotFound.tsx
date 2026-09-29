import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ShoppingBag, UtensilsCrossed, Hotel, Dumbbell, Waves, Scissors, Trophy, Calendar, Monitor, Ticket, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MODULES = [
  { label: 'Boutique',      path: '/boutique',       Icon: ShoppingBag,     color: '#d4a843' },
  { label: 'Restaurant',   path: '/restaurant',     Icon: UtensilsCrossed, color: '#ef4444' },
  { label: 'Hôtel',         path: '/hotel',          Icon: Hotel,           color: '#3b82f6' },
  { label: 'Gym',           path: '/salle-de-sport', Icon: Dumbbell,        color: '#10b981' },
  { label: 'Piscine',       path: '/piscine',        Icon: Waves,           color: '#06b6d4' },
  { label: 'Salon',         path: '/salon',          Icon: Scissors,        color: '#f59e0b' },
  { label: 'Terrain',       path: '/terrain-foot',   Icon: Trophy,          color: '#22c55e' },
  { label: 'Événements',    path: '/evenementiel',   Icon: Calendar,        color: '#a855f7' },
  { label: 'Cybercafé',     path: '/cybercafe',      Icon: Monitor,         color: '#64748b' },
  { label: 'Spectacles',    path: '/spectacles',     Icon: Ticket,          color: '#ec4899' },
  { label: 'Espace Kids',   path: '/espace-enfants', Icon: Baby,            color: '#f97316' },
];

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl mx-auto"
      >
        {/* Big 404 */}
        <div className="relative mb-6">
          <div className="text-[120px] sm:text-[160px] font-display font-black leading-none select-none"
            style={{ color: 'hsl(var(--muted))', letterSpacing: '-0.05em' }}>
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl">🧭</div>
          </div>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Page introuvable</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Cette page n'existe pas ou a été déplacée. Retrouvez tous nos services ci-dessous.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {MODULES.map(m => (
            <Link key={m.path} to={m.path}>
              <motion.div
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:shadow-md transition-all text-sm font-medium"
              >
                <m.Icon className="w-4 h-4" style={{ color: m.color }} />
                {m.label}
              </motion.div>
            </Link>
          ))}
        </div>

        <Button asChild size="lg" className="rounded-full">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" /> Retour à l'accueil
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
