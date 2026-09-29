import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useClientAuth } from '../lib/clientAuth';
import logoIcon from '@/assets/logo-icon.png';

/* ─── Inline SVG icons ─────────────────────────────────────────── */
const MailIcon = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2.5" y="4.5" width="15" height="11" rx="2"/>
    <path d="M2.5 7.5l7.5 5 7.5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="4" y="9" width="12" height="8.5" rx="2"/>
    <path d="M6.5 9V6.5a3.5 3.5 0 017 0V9" strokeLinecap="round"/>
    <circle cx="10" cy="13.5" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="10" cy="7" r="3.5"/>
    <path d="M2.5 17.5a7.5 7.5 0 0115 0" strokeLinecap="round"/>
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 3.5A1.5 1.5 0 014.5 2h1.72a1.5 1.5 0 011.46 1.15l.7 3.11a1.5 1.5 0 01-.43 1.43L6.8 8.82a11.04 11.04 0 005.38 5.38l1.13-1.13a1.5 1.5 0 011.43-.43l3.11.7A1.5 1.5 0 0119 14.78V16.5A1.5 1.5 0 0117.5 18C9.49 18 2 10.51 2 2.5v-.01A1.5 1.5 0 013 3.5z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6S1.5 10 1.5 10z"/>
    <circle cx="10" cy="10" r="2.5"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 3l14 14M8.5 8.57A2.5 2.5 0 0012.43 12.5M1.5 10S4.5 4 10 4c1.36 0 2.62.3 3.75.83M18.5 10S16 16 10 16c-1.36 0-2.62-.3-3.75-.83" strokeLinecap="round"/>
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SpinIcon = () => (
  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4"/>
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

/* ─── Sub-components ────────────────────────────────────────────── */
type FieldProps = {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
};
const Field = ({ label, icon, children, right }: FieldProps) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{label}</label>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'hsl(var(--muted-foreground))' }}>
        {icon}
      </span>
      {children}
      {right && <span className="absolute right-3 top-1/2 -translate-y-1/2">{right}</span>}
    </div>
  </div>
);

const inputStyle: React.CSSProperties = {
  background: 'hsl(var(--input))',
  border: '1.5px solid hsl(var(--border))',
  color: 'hsl(var(--foreground))',
  borderRadius: '0.75rem',
  width: '100%',
  height: '48px',
  paddingLeft: '40px',
  paddingRight: '16px',
  fontSize: '14px',
  fontWeight: 500,
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
};
const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'hsl(43 96% 44%)';
    e.target.style.boxShadow = '0 0 0 3px hsl(43 96% 44% / 0.14)';
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'hsl(var(--border))';
    e.target.style.boxShadow = 'none';
  },
};

function GoldBtn({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 mt-1"
      style={{
        background: 'linear-gradient(135deg, hsl(43 96% 48%), hsl(36 90% 38%))',
        color: '#fff',
        boxShadow: loading ? 'none' : '0 8px 24px -4px hsl(43 96% 44% / 0.45)',
      }}>
      {loading ? <><SpinIcon /> Chargement…</> : <>{children} <ArrowIcon /></>}
    </button>
  );
}

/* ─── Data ──────────────────────────────────────────────────────── */
const DEMO_ACCOUNTS = [
  { email: 'demo.client@arenah.com', password: 'Demo@2024', label: 'Client', badge: 'FREE' },
  { email: 'demo.vip@arenah.com',    password: 'Demo@2024', label: 'VIP',    badge: 'VIP'  },
  { email: 'demo.premium@arenah.com',password: 'Demo@2024', label: 'Premium',badge: 'PRO'  },
];

const FEATURES = [
  { icon: '🛍️', text: 'Boutique & Restaurant' },
  { icon: '🏨', text: 'Hôtel & Salle sport' },
  { icon: '✂️', text: 'Piscine & Salon beauté' },
  { icon: '🎭', text: 'Événements & Spectacles' },
];

/* ─── Main component ────────────────────────────────────────────── */
const ClientLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp } = useClientAuth();
  const [tab, setTab]         = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const refCode = searchParams.get('ref') ?? '';

  const roleRedirect = (u: typeof user) => {
    if (!u) return;
    if (['admin_module', 'super_admin'].includes(u.role)) navigate('/admin');
    else navigate('/');
  };

  useEffect(() => { roleRedirect(user); }, [user]);
  // Si un code de parrainage est dans l'URL, ouvrir directement l'onglet inscription
  useEffect(() => { if (refCode) setTab('register'); }, [refCode]);

  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [rName,    setRName]    = useState('');
  const [rEmail,   setREmail]   = useState('');
  const [rPhone,   setRPhone]   = useState('');
  const [rPass,    setRPass]    = useState('');
  const [rConfirm, setRConfirm] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { toast.error('Remplissez tous les champs'); return; }
    setLoading(true);
    const res = await signIn(loginEmail, loginPassword);
    if (res.success) { toast.success('Connexion réussie !'); roleRedirect(res.user ?? null); }
    else toast.error(res.error || 'Identifiants incorrects');
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rName || !rEmail || !rPass) { toast.error('Remplissez les champs obligatoires'); return; }
    if (rPass !== rConfirm) { toast.error('Mots de passe différents'); return; }
    if (rPass.length < 6) { toast.error('Minimum 6 caractères'); return; }
    setLoading(true);
    const res = await signUp(rEmail, rPass, rName, rPhone || undefined, refCode || undefined);
    if (res.success) { toast.success(refCode ? 'Compte créé ! 500 pts de bienvenue offerts 🎁' : 'Compte créé avec succès !'); navigate('/'); }
    else toast.error(res.error || "Erreur lors de l'inscription");
    setLoading(false);
  };

  const handleDemo = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setLoading(true);
    const res = await signIn(acc.email, acc.password);
    if (res.success) { toast.success(`Bienvenue ${acc.label} ✨`); roleRedirect(res.user ?? null); }
    else toast.error('Compte démo indisponible — vérifiez votre connexion.');
    setLoading(false);
  };

  return (
    <div className="client-theme min-h-screen flex">

      {/* ── PANNEAU GAUCHE (branding) ────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[54%] xl:w-[52%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, hsl(225 45% 8%) 0%, hsl(225 40% 12%) 60%, hsl(35 50% 12%) 100%)' }}>

        {/* Orbes lumineux */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-20 w-[480px] h-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(43 96% 44% / 0.16) 0%, transparent 65%)' }} />
          <div className="absolute bottom-[-60px] left-[-40px] w-[320px] h-[320px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(43 96% 44% / 0.10) 0%, transparent 65%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(225 40% 16% / 0.8) 0%, transparent 70%)' }} />
        </div>

        {/* Grille subtile */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(43 96% 44% / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(43 96% 44% / 0.04) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }} />

        {/* Ligne diagonale déco */}
        <div className="absolute top-0 right-0 w-px h-full opacity-20"
          style={{ background: 'linear-gradient(180deg, transparent, hsl(43 96% 55%), transparent)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3.5 group">
            <img src={logoIcon} alt="ARENAH"
              className="w-14 h-14 object-contain transition-transform group-hover:scale-105" />
            <div>
              <div className="font-bold text-xl tracking-tight text-white leading-none">ARENAH</div>
              <div className="text-[10px] uppercase tracking-[0.22em] mt-0.5" style={{ color: 'hsl(43 80% 65%)' }}>
                Self-service Platform
              </div>
            </div>
          </Link>
        </div>

        {/* Contenu central */}
        <div className="relative z-10 space-y-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{
                background: 'hsl(43 96% 44% / 0.12)',
                border: '1px solid hsl(43 96% 44% / 0.3)',
                color: 'hsl(43 96% 62%)',
              }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(43 96% 60%)' }} />
              Plateforme tout-en-un
            </div>

            <h1 className="text-4xl xl:text-[52px] font-bold leading-[1.08] text-white mb-5 tracking-tight">
              Tous vos services,<br />
              <span style={{
                background: 'linear-gradient(90deg, hsl(43 96% 60%), hsl(38 90% 52%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                en un seul lieu.
              </span>
            </h1>
            <p className="text-base leading-relaxed max-w-md" style={{ color: 'hsl(0 0% 65%)' }}>
              Accédez à 10 services premium de votre espace commercial — réservation, achat, et gestion en temps réel.
            </p>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                style={{
                  background: 'hsl(0 0% 100% / 0.05)',
                  border: '1px solid hsl(43 96% 44% / 0.15)',
                  backdropFilter: 'blur(8px)',
                }}>
                <span className="text-lg shrink-0">{f.icon}</span>
                <span className="text-sm font-medium leading-tight" style={{ color: 'hsl(0 0% 82%)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bas */}
        <div className="relative z-10">
          <div className="flex items-center gap-1 mb-5">
            <div className="flex-1 h-px" style={{ background: 'hsl(0 0% 100% / 0.1)' }} />
            <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'hsl(0 0% 40%)' }}>Chiffres clés</span>
            <div className="flex-1 h-px" style={{ background: 'hsl(0 0% 100% / 0.1)' }} />
          </div>
          <div className="flex gap-8">
            {[['10', 'Services'], ['24/7', 'Disponible'], ['100%', 'Sécurisé']].map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-bold leading-none" style={{ color: 'hsl(43 96% 55%)' }}>{v}</div>
                <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'hsl(0 0% 40%)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PANNEAU DROIT (formulaire) ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12"
        style={{ background: 'hsl(var(--background))' }}>
        <div className="w-full max-w-[440px]">

          {/* Logo mobile uniquement */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src={logoIcon} alt="ARENAH" className="w-10 h-10 object-contain" />
              <div className="text-left">
                <div className="font-bold text-lg tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>ARENAH</div>
                <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Self-service</div>
              </div>
            </Link>
          </div>

          {/* Titre */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
              {tab === 'login' ? 'Bon retour !' : 'Créer un compte'}
            </h2>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {tab === 'login'
                ? 'Connectez-vous à votre espace personnel.'
                : "Rejoignez ARENAH — c'est gratuit et rapide."}
            </p>
          </div>

          {/* Tabs switcher */}
          <div className="flex gap-1 p-1 rounded-xl mb-7"
            style={{ background: 'hsl(var(--muted))' }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200"
                style={tab === t ? {
                  background: 'hsl(var(--card))',
                  color: 'hsl(43 96% 40%)',
                  boxShadow: '0 2px 8px hsl(0 0% 0% / 0.08)',
                } : {
                  color: 'hsl(var(--muted-foreground))',
                }}>
                {t === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          {/* ── CONNEXION ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Adresse email" icon={<MailIcon />}>
                <input type="email" placeholder="vous@exemple.com"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  disabled={loading} style={inputStyle} {...focusHandlers} />
              </Field>

              <Field label="Mot de passe" icon={<LockIcon />}
                right={
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="transition-opacity hover:opacity-60"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }>
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                  disabled={loading} style={{ ...inputStyle, paddingRight: '40px' }} {...focusHandlers} />
              </Field>

              <div className="flex justify-end -mt-1">
                <button type="button"
                  onClick={() => toast.info('Fonctionnalité à venir')}
                  className="text-xs font-medium hover:opacity-70 transition"
                  style={{ color: 'hsl(43 96% 40%)' }}>
                  Mot de passe oublié ?
                </button>
              </div>

              <GoldBtn loading={loading}>Se connecter</GoldBtn>
            </form>
          )}

          {/* ── INSCRIPTION ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <Field label="Nom complet *" icon={<UserIcon />}>
                <input type="text" placeholder="Jean Dupont"
                  value={rName} onChange={e => setRName(e.target.value)}
                  disabled={loading} style={inputStyle} {...focusHandlers} />
              </Field>
              <Field label="Adresse email *" icon={<MailIcon />}>
                <input type="email" placeholder="vous@exemple.com"
                  value={rEmail} onChange={e => setREmail(e.target.value)}
                  disabled={loading} style={inputStyle} {...focusHandlers} />
              </Field>
              <Field label="Téléphone" icon={<PhoneIcon />}>
                <input type="tel" placeholder="+261 34 00 000 00"
                  value={rPhone} onChange={e => setRPhone(e.target.value)}
                  disabled={loading} style={inputStyle} {...focusHandlers} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mot de passe *" icon={<LockIcon />}>
                  <input type="password" placeholder="••••••••"
                    value={rPass} onChange={e => setRPass(e.target.value)}
                    disabled={loading} style={inputStyle} {...focusHandlers} />
                </Field>
                <Field label="Confirmer *" icon={<LockIcon />}>
                  <input type="password" placeholder="••••••••"
                    value={rConfirm} onChange={e => setRConfirm(e.target.value)}
                    disabled={loading} style={inputStyle} {...focusHandlers} />
                </Field>
              </div>
              <GoldBtn loading={loading}>Créer mon compte</GoldBtn>
              <p className="text-center text-xs pt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                En créant un compte vous acceptez nos{' '}
                <span className="underline cursor-pointer" style={{ color: 'hsl(43 96% 40%)' }}>
                  conditions d'utilisation
                </span>
              </p>
            </form>
          )}

          {/* ── COMPTES DÉMO ── */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: 'hsl(var(--muted-foreground))' }}>
                Accès démo
              </span>
              <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc, i) => (
                <DemoCard key={i} acc={acc} loading={loading} onLogin={handleDemo} />
              ))}
            </div>

            <p className="text-center text-[11px] mt-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Test rapide sans inscription
            </p>
          </div>

          {/* Retour accueil */}
          <div className="mt-6 text-center">
            <Link to="/"
              className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-60"
              style={{ color: 'hsl(var(--muted-foreground))' }}>
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── DemoCard ──────────────────────────────────────────────────── */
type DemoAcc = typeof DEMO_ACCOUNTS[0];
function DemoCard({ acc, loading, onLogin }: { acc: DemoAcc; loading: boolean; onLogin: (a: DemoAcc) => void }) {
  const badgeColors: Record<string, string> = {
    FREE: 'hsl(152 50% 38%)',
    VIP:  'hsl(43 96% 40%)',
    PRO:  'hsl(225 60% 55%)',
  };
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onLogin(acc)}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl text-center transition-all duration-200 disabled:opacity-50"
      style={{
        background: 'hsl(var(--card))',
        border: `1.5px solid ${hovered ? 'hsl(43 96% 44%)' : 'hsl(var(--border))'}`,
        boxShadow: hovered ? '0 4px 16px hsl(43 96% 44% / 0.15)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}>
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{ background: `${badgeColors[acc.badge]}18`, color: badgeColors[acc.badge] }}>
        {acc.badge}
      </span>
      <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
        {acc.label}
      </span>
    </button>
  );
}

export default ClientLogin;
