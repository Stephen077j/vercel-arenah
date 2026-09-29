import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin, Shield, Send, CheckCircle2 } from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';

const NAV_COLS = [
  {
    title: 'Services',
    links: [
      { label: 'Boutique',       to: '/boutique' },
      { label: 'Restaurant',     to: '/restaurant' },
      { label: 'Hôtel',          to: '/hotel' },
      { label: 'Salle de sport', to: '/salle-de-sport' },
      { label: 'Piscine',        to: '/piscine' },
      { label: 'Salon',          to: '/salon' },
    ],
  },
  {
    title: 'Autres',
    links: [
      { label: 'Terrain de foot',   to: '/terrain-foot' },
      { label: 'Événementiel',      to: '/evenementiel' },
      { label: 'Cybercafé',         to: '/cybercafe' },
      { label: 'Spectacles',        to: '/spectacles' },
      { label: '🧸 Espace Enfants', to: '/espace-enfants' },
      { label: 'Mes activités',     to: '/mes-commandes' },
      { label: 'Mes paiements',   to: '/mes-paiements' },
      { label: 'Favoris',         to: '/favoris' },
    ],
  },
  {
    title: 'Aide',
    links: [
      { label: 'FAQ',                        to: '/faq' },
      { label: 'À propos',                  to: '/a-propos' },
      { label: "Conditions d'utilisation",  to: '/cgv' },
      { label: 'Confidentialité',           to: '/confidentialite' },
    ],
  },
];

/* ── Wave divider SVG ── */
const WaveDivider = () => (
  <div className="w-full overflow-hidden leading-none" style={{ marginBottom: '-2px' }}>
    <svg
      viewBox="0 0 1440 56"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: '56px', display: 'block' }}
    >
      <path
        d="M0,28 C240,56 480,0 720,28 C960,56 1200,0 1440,28 L1440,56 L0,56 Z"
        fill="#1a1814"
      />
    </svg>
  </div>
);

/* ── Spiral décoratif compact ── */
const SpiralDecor = ({ className = '' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="0.6" strokeDasharray="4 6" opacity="0.2" />
    <circle cx="100" cy="100" r="65" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 7" opacity="0.15" />
    <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 8" opacity="0.1" />
    <path
      d="M100 10 C140 10,185 50,185 100 C185 150,140 185,100 185 C50 185,15 145,15 100 C15 55,50 25,100 25"
      stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.15"
    />
    <circle cx="100" cy="100" r="2.5" fill="currentColor" opacity="0.25" />
  </svg>
);

/* ── Blueprint grid ── */
const BlueprintGrid = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <pattern id="bp-grid-sm" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(212,175,55,0.05)" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bp-grid-sm)" />
  </svg>
);

const NewsletterBar = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setStatus('ok'); setMsg(data.message || 'Inscrit(e) !'); }
      else { setStatus('err'); setMsg(data.error || 'Erreur'); }
    } catch { setStatus('err'); setMsg('Erreur réseau'); }
  };

  return (
    <div className="relative z-10 border-t" style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="sm:flex-1">
          <p className="font-semibold text-sm" style={{ color: '#f5f0e8' }}>Recevez nos offres exclusives</p>
          <p className="text-xs" style={{ color: 'rgba(245,240,232,0.45)' }}>Promos, événements et nouveautés ARENAH</p>
        </div>
        {status === 'ok' ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </div>
        ) : (
          <form onSubmit={submit} className="flex gap-2">
            <input
              type="email" value={email} onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
              placeholder="votre@email.com"
              className="rounded-lg px-3 py-2 text-sm outline-none w-52 text-foreground"
              style={{ background: 'rgba(245,240,232,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#f5f0e8' }}
              disabled={status === 'loading'}
            />
            <button
              type="submit" disabled={status === 'loading' || !email}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#d4af37', color: '#111009' }}
            >
              <Send className="w-3.5 h-3.5" />
              {status === 'loading' ? '...' : "S'inscrire"}
            </button>
          </form>
        )}
        {status === 'err' && <p className="text-xs text-red-400">{msg}</p>}
      </div>
    </div>
  );
};

const ClientFooter = () => (
  <>
    {/* Wave divider au-dessus du footer */}
    <WaveDivider />

    <footer
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#1a1814 0%,#111009 60%,#0e0d0b 100%)' }}
    >
      <BlueprintGrid />

      {/* Spirals déco — très discrètes */}
      <SpiralDecor className="absolute -left-14 top-1/2 -translate-y-1/2 w-44 h-44 text-[#d4af37] pointer-events-none" />
      <SpiralDecor className="absolute -right-10 bottom-0 w-32 h-32 text-[#d4af37] pointer-events-none opacity-50" />

      {/* ── CONTENU PRINCIPAL compact ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Brand col */}
          <div className="md:col-span-3">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <img src={logoIcon} alt="ARENAH" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <div>
                <div className="font-bold text-sm tracking-tight" style={{ color: '#f5f0e8', opacity: 0.9 }}>ARENAH</div>
                <div style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#d4af37', opacity: 0.7, textTransform: 'uppercase' }}>Self-service</div>
              </div>
            </Link>

            <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.5)', lineHeight: '1.6', maxWidth: '180px', marginBottom: '12px' }}>
              Parc de loisirs multi-services à Ivato — Restaurant, Fitness, Salon, Piscine, Hôtel, Espace Enfants & plus.
            </p>

            {/* Contacts compacts */}
            <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.45)', lineHeight: '1.9' }}>
              <a href="tel:+261344946939" className="flex items-center gap-1.5 mb-1 hover:text-[#d4af37] transition-colors">
                <Phone className="w-3 h-3 shrink-0" style={{ color: '#d4af37', opacity: 0.7 }} />
                +261 34 49 469 39
              </a>
              <div className="flex items-center gap-1.5 mb-1">
                <Mail className="w-3 h-3 shrink-0" style={{ color: '#d4af37', opacity: 0.7 }} />
                contact@arenah.mg
              </div>
              <a
                href="https://maps.app.goo.gl/Dm9JAzTVqHCLgECaA"
                target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-1.5 hover:text-[#d4af37] transition-colors"
              >
                <MapPin className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#d4af37', opacity: 0.7 }} />
                Route vers Anjomakely, Ivato
              </a>
              <div className="flex items-center gap-1.5 mt-1" style={{ color: 'rgba(212,175,55,0.6)' }}>
                <span style={{ fontSize: '9px', letterSpacing: '0.05em' }}>🕐 Lun–Dim · 09h00 – 18h00</span>
              </div>
            </div>

            {/* Réseaux */}
            <div className="flex items-center gap-1.5 mt-3">
              <a
                href="https://web.facebook.com/profile.php?id=61588144163314"
                target="_blank" rel="noopener noreferrer"
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)', color: 'rgba(245,240,232,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
              >
                <Facebook className="w-3 h-3" />
              </a>
              {[Instagram, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)', color: 'rgba(245,240,232,0.5)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
                >
                  <Icon className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>

          {/* Colonnes liens */}
          <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-3 gap-5">
            {NAV_COLS.map(col => (
              <div key={col.title}>
                <h4
                  className="font-semibold mb-2"
                  style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d4af37', opacity: 0.8 }}
                >
                  {col.title}
                </h4>
                <ul className="space-y-1.5">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="transition-colors duration-200 hover:text-[#d4af37]"
                        style={{ fontSize: '12px', color: 'rgba(245,240,232,0.45)' }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Newsletter ── */}
      <NewsletterBar />

      {/* ── BARRE BASSE ultra-compacte ── */}
      <div
        className="relative z-10"
        style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5" style={{ fontSize: '11px', color: 'rgba(245,240,232,0.3)' }}>
            <Shield className="w-3 h-3" />
            Paiements sécurisés · MVola · Orange Money · Visa · MasterCard
          </div>
          <div className="flex items-center gap-3" style={{ fontSize: '11px', color: 'rgba(245,240,232,0.3)' }}>
            <span>© {new Date().getFullYear()} ARENAH</span>
            <Link to="/confidentialite" className="hover:text-[#d4af37] transition-colors">Confidentialité</Link>
            <Link to="/cgv" className="hover:text-[#d4af37] transition-colors">CGU</Link>
          </div>
        </div>
      </div>
    </footer>
  </>
);

export default ClientFooter;
