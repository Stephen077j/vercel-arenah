import { api } from './client.js';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export const pushApi = {
  isSupported: () => 'serviceWorker' in navigator && 'PushManager' in window,

  getPermission: () => Notification.permission,

  async subscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    });
    await api.post('/api/push/subscribe', sub.toJSON());
    return true;
  },

  async unsubscribe(): Promise<void> {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await api.delete('/api/push/unsubscribe', { endpoint: sub.endpoint });
    await sub.unsubscribe();
  },

  async isSubscribed(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  },
};
