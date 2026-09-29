import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, CheckCheck, Trash2, Loader2, ShoppingBag, Hotel, Dumbbell, Scissors, Waves, Trophy, Calendar, Monitor, Ticket, CreditCard, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { notifApi } from '@/api/orders';
import { useClientAuth } from '../lib/clientAuth';

interface Notif {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  success:  { icon: <Check className="w-4 h-4" />,         color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  error:    { icon: <BellOff className="w-4 h-4" />,       color: 'bg-destructive/10 text-destructive border-destructive/20' },
  payment:  { icon: <CreditCard className="w-4 h-4" />,    color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  info:     { icon: <Info className="w-4 h-4" />,          color: 'bg-sky-500/10 text-sky-600 border-sky-200' },
};

const MODULE_ICON: Record<string, React.ReactNode> = {
  boutique:   <ShoppingBag className="w-4 h-4" />,
  restaurant: <ShoppingBag className="w-4 h-4" />,
  hotel:      <Hotel className="w-4 h-4" />,
  gym:        <Dumbbell className="w-4 h-4" />,
  salon:      <Scissors className="w-4 h-4" />,
  pool:       <Waves className="w-4 h-4" />,
  field:      <Trophy className="w-4 h-4" />,
  event:      <Calendar className="w-4 h-4" />,
  cybercafe:  <Monitor className="w-4 h-4" />,
  show:       <Ticket className="w-4 h-4" />,
};

function getIcon(notif: Notif) {
  for (const [key, icon] of Object.entries(MODULE_ICON)) {
    if (notif.title.toLowerCase().includes(key) || notif.message?.toLowerCase().includes(key)) return icon;
  }
  return TYPE_META[notif.type]?.icon ?? <Bell className="w-4 h-4" />;
}

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ClientNotifications() {
  const { user } = useClientAuth();
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    try {
      const data: Notif[] = await notifApi.getAll();
      setNotifs(data);
    } catch { toast.error('Impossible de charger les notifications'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

  const markRead = async (id: string) => {
    await notifApi.markRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await notifApi.markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('Toutes les notifications lues');
  };

  const deleteNotif = async (id: string) => {
    await notifApi.delete(id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const displayed  = filter === 'unread' ? notifs.filter(n => !n.read) : notifs;
  const unreadCount = notifs.filter(n => !n.read).length;

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
      <Bell className="w-16 h-16 text-muted-foreground/30" />
      <h2 className="font-display text-2xl">Connectez-vous</h2>
      <p className="text-muted-foreground">Vos notifications apparaissent ici après connexion.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
              <Bell className="w-3.5 h-3.5" /> Centre de notifications
            </div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-muted-foreground mt-1">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="shrink-0">
              <CheckCheck className="w-4 h-4 mr-1.5" /> Tout marquer lu
            </Button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {f === 'all' ? `Tout (${notifs.length})` : `Non lues (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <BellOff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification pour le moment'}
            </p>
            {filter === 'unread' && <button onClick={() => setFilter('all')} className="text-primary text-sm mt-2 underline">Voir toutes</button>}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((n, i) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.info;
              return (
                <motion.div key={n.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group flex gap-4 rounded-2xl border p-4 transition cursor-pointer ${!n.read ? 'bg-primary/3 border-primary/20' : 'bg-card border-border'}`}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                >
                  {/* Icône */}
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${meta.color}`}>
                    {getIcon(n)}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-tight ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-primary" />}
                        <button
                          onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                          className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {n.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {notifs.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-8">
            {notifs.length} notification{notifs.length > 1 ? 's' : ''} au total — les 50 plus récentes
          </p>
        )}
      </motion.div>
    </div>
  );
}
