import { useState } from 'react';
import { X, MessageCircle } from 'lucide-react';

const PHONE = '261344946939';
const DEFAULT_MSG = encodeURIComponent('Bonjour ARENAH, je souhaite avoir des informations sur vos services.');

const QUICK_MSGS = [
  { label: 'Réserver une chambre', text: 'Bonjour, je voudrais réserver une chambre à ARENAH.' },
  { label: 'Commander un repas',   text: 'Bonjour, je voudrais commander un repas au restaurant ARENAH.' },
  { label: 'Infos spectacles',     text: 'Bonjour, pouvez-vous me donner des infos sur les spectacles à venir ?' },
  { label: 'Autre question',       text: 'Bonjour ARENAH, j\'ai une question.' },
];

const WhatsAppButton = () => {
  const [open, setOpen] = useState(false);

  const send = (text: string) => {
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    setOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3">
      {/* Menu rapide */}
      {open && (
        <div className="flex flex-col gap-2 items-end">
          <div className="rounded-2xl border border-border bg-background shadow-2xl overflow-hidden w-64">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Contacter ARENAH</p>
                <p className="text-[10px] text-muted-foreground">Réponse en quelques minutes</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-2 space-y-1">
              {QUICK_MSGS.map(m => (
                <button
                  key={m.label}
                  onClick={() => send(m.text)}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg hover:bg-muted transition-colors font-medium"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bouton principal */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ background: '#25d366' }}
        aria-label="Contacter sur WhatsApp"
      >
        {open
          ? <X className="w-6 h-6 text-white" />
          : <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.12 1.523 5.855L.058 23.37a.5.5 0 00.618.606l5.652-1.484A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.95 9.95 0 01-5.07-1.386l-.363-.215-3.765.988.988-3.667-.237-.378A9.958 9.958 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
        }
      </button>

      {/* Badge pulsant quand fermé */}
      {!open && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-background animate-pulse" />
      )}
    </div>
  );
};

export default WhatsAppButton;
