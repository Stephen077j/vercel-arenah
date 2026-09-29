import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { pushApi } from '@/api/push';
import { toast } from 'sonner';

export default function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const ok = pushApi.isSupported();
    setSupported(ok);
    if (ok) {
      setPermission(pushApi.getPermission());
      pushApi.isSubscribed().then(setSubscribed).catch(() => {});
    }
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await pushApi.unsubscribe();
        setSubscribed(false);
        toast.success('Notifications désactivées');
      } else {
        const ok = await pushApi.subscribe();
        if (ok) { setSubscribed(true); toast.success('Notifications activées ! 🔔'); }
        else toast.error('Permission refusée par le navigateur');
        setPermission(pushApi.getPermission());
      }
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  if (permission === 'denied') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', padding: '8px 10px', borderRadius: 8, background: '#f8fafc' }}>
      <BellOff size={13} />
      Notifications bloquées dans le navigateur
    </div>
  );

  return (
    <button onClick={toggle} disabled={loading} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
      border: `1px solid ${subscribed ? 'rgba(34,197,94,0.3)' : 'var(--border, #e2e8f0)'}`,
      background: subscribed ? 'rgba(34,197,94,0.08)' : 'var(--card, #fff)',
      color: subscribed ? '#16a34a' : 'var(--foreground, #0f172a)',
      transition: 'all 0.18s',
      width: '100%',
    }}>
      {subscribed ? <Bell size={15} color="#16a34a" /> : <Bell size={15} />}
      {loading ? 'Chargement…' : subscribed ? 'Notifications activées' : 'Activer les notifications push'}
    </button>
  );
}
