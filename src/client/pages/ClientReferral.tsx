import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Gift, Copy, CheckCircle2, Users, Star, Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientAuth } from '../lib/clientAuth';
import { loyaltyApi, LoyaltyStatus } from '@/api/loyalty';
import { toast } from 'sonner';

/* Génère le code parrainage depuis l'ID user (identique à la logique serveur) */
function buildRefCode(userId: string) {
  return userId.replace(/-/g, '').slice(0, 6).toUpperCase();
}

const BONUS_PTS = 500;
const BONUS_AR  = BONUS_PTS * 10; // 1 pt = 10 Ar

const ClientReferral = () => {
  const { user } = useClientAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyStatus | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loyaltyApi.getMe().then(setLoyalty).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Gift className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground">Connectez-vous pour accéder à votre programme de parrainage.</p>
        <Button asChild><Link to="/login">Se connecter</Link></Button>
      </div>
    );
  }

  const code    = buildRefCode(user.id);
  const refLink = `${window.location.origin}/login?ref=${code}`;
  const waMsg   = encodeURIComponent(`🎁 Rejoins ARENAH avec mon lien et on gagne tous les deux ${BONUS_AR.toLocaleString()} Ar en points fidélité !\n${refLink}`);

  const copyLink = async () => {
    await navigator.clipboard.writeText(refLink);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2500);
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'ARENAH — Parrainage', text: `Rejoins ARENAH et gagne ${BONUS_AR.toLocaleString()} Ar !`, url: refLink });
    } else {
      copyLink();
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/profil" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour au profil
      </Link>

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden mb-8 text-center p-10 relative"
        style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)' }}>
        <div className="text-5xl mb-4">🎁</div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Parrainez vos amis</h1>
        <p className="text-white/60 text-sm max-w-sm mx-auto">
          Invitez un ami sur ARENAH. Dès son inscription,{' '}
          <span className="text-yellow-400 font-semibold">vous gagnez chacun {BONUS_AR.toLocaleString()} Ar</span>{' '}
          en points fidélité.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { emoji: '📤', step: '1', label: 'Partagez votre lien' },
          { emoji: '👤', step: '2', label: 'L\'ami crée son compte' },
          { emoji: '⭐', step: '3', label: 'Vous gagnez chacun des points' },
        ].map(s => (
          <div key={s.step} className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Étape {s.step}</div>
            <div className="text-xs font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reward */}
      <div className="rounded-2xl border mb-6 overflow-hidden"
        style={{ borderColor: '#d4af3740', background: '#d4af3708' }}>
        <div className="flex">
          <div className="flex-1 p-5 border-r" style={{ borderColor: '#d4af3730' }}>
            <p className="text-xs text-muted-foreground mb-1">Vous recevez</p>
            <p className="text-2xl font-bold" style={{ color: '#d4a843' }}>+{BONUS_PTS} pts</p>
            <p className="text-xs text-muted-foreground">≈ {BONUS_AR.toLocaleString()} Ar</p>
          </div>
          <div className="flex-1 p-5">
            <p className="text-xs text-muted-foreground mb-1">Votre filleul reçoit</p>
            <p className="text-2xl font-bold" style={{ color: '#d4a843' }}>+{BONUS_PTS} pts</p>
            <p className="text-xs text-muted-foreground">Cadeau de bienvenue</p>
          </div>
        </div>
      </div>

      {/* Votre code */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Votre code & lien</p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 flex items-center justify-center h-12 rounded-xl border-2 border-dashed font-mono text-xl font-bold tracking-[0.3em]"
            style={{ borderColor: '#d4af3740', color: '#d4a843' }}>
            {code}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 mb-4">
          <span className="flex-1 text-xs text-muted-foreground truncate font-mono">{refLink}</span>
          <button onClick={copyLink} className="shrink-0 text-xs font-medium flex items-center gap-1 text-primary hover:underline">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
        <div className="flex gap-2">
          <Button onClick={share} className="flex-1 gap-2">
            <Share2 className="w-4 h-4" /> Partager
          </Button>
          <a
            href={`https://wa.me/?text=${waMsg}`}
            target="_blank" rel="noopener"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: '#25d366' }}
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>
      </div>

      {/* Solde actuel */}
      {loyalty && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" />Vos points fidélité</p>
            <span className="text-xs text-muted-foreground">Niveau {loyalty.level.name}</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold" style={{ color: loyalty.level.color }}>{loyalty.total.toLocaleString()}</span>
            <span className="text-muted-foreground text-sm mb-1">pts</span>
            <span className="text-muted-foreground text-sm mb-1">≈ {(loyalty.total * loyalty.ar_per_point).toLocaleString()} Ar</span>
          </div>
          {loyalty.level.next && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, ((loyalty.total - loyalty.level.min) / (loyalty.level.next - loyalty.level.min)) * 100)}%`,
                    background: `linear-gradient(90deg, ${loyalty.level.color}88, ${loyalty.level.color})`,
                  }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(loyalty.level.next - loyalty.total).toLocaleString()} pts avant le niveau suivant
              </p>
            </div>
          )}
        </div>
      )}

      {/* Note légale */}
      <p className="text-[10px] text-muted-foreground text-center mt-6 leading-relaxed">
        Les points de parrainage sont crédités dès que votre filleul crée un compte ARENAH.
        Un seul parrainage par filleul. ARENAH se réserve le droit de modifier ou de suspendre ce programme.
      </p>
    </div>
  );
};

export default ClientReferral;
