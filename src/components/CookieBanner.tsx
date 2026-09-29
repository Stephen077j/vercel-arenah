import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X, Shield } from 'lucide-react';

const CookieBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('arenah_cookies')) {
      const t = setTimeout(() => setShow(true), 1800);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  const accept = (type: 'all' | 'essential') => {
    localStorage.setItem('arenah_cookies', type);
    setShow(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:p-5 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div
          className="rounded-2xl border border-border bg-background/97 backdrop-blur-xl shadow-2xl overflow-hidden"
          style={{ animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* Barre colorée en haut */}
          <div className="h-0.5 w-full bg-gradient-to-r from-primary via-amber-400 to-primary" />

          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icône */}
            <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Cookie className="w-5 h-5 text-amber-500" />
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold">Ce site utilise des cookies</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  <Shield className="w-2.5 h-2.5" />
                  Sécurisé
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nous utilisons des cookies pour personnaliser votre expérience, mémoriser vos préférences
                et améliorer nos recommandations. Aucun cookie n'est partagé avec des tiers.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none text-xs h-8 rounded-lg"
                onClick={() => accept('essential')}
              >
                Essentiels
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none text-xs h-8 rounded-lg"
                onClick={() => accept('all')}
              >
                Tout accepter
              </Button>
              <button
                onClick={() => accept('essential')}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CookieBanner;
