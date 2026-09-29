import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

const PWAInstallBanner = () => {
  const [prompt, setPrompt] = useState<Event & { prompt?: () => Promise<void> } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pwa_dismissed')) return;
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as any); setVisible(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt || !(prompt as any).prompt) return;
    await (prompt as any).prompt();
    dismiss();
  };

  const dismiss = () => { setVisible(false); localStorage.setItem('pwa_dismissed', '1'); };

  if (!visible) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[300] flex justify-center pointer-events-none px-4 pt-3">
      <div
        className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-background/95 backdrop-blur-sm shadow-2xl px-4 py-3 max-w-sm w-full"
        style={{ animation: 'slideDown .3s ease' }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">Installer l'app ARENAH</p>
          <p className="text-[10px] text-muted-foreground">Accès rapide depuis votre écran d'accueil</p>
        </div>
        <button onClick={install} className="shrink-0 text-xs font-semibold text-primary hover:underline">Installer</button>
        <button onClick={dismiss} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

export default PWAInstallBanner;
