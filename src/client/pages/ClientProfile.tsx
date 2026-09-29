import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, Phone, Edit2, Save, X, LogOut, Lock, ShieldCheck,
  Camera, MapPin, FileText, CreditCard, Package, Loader2, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useClientAuth } from '../lib/clientAuth';
import { getMe, updateMe } from '@/api/auth';
import LoyaltyCard from '../components/LoyaltyCard';
import PushToggle from '../components/PushToggle';

const ClientProfile = () => {
  const navigate = useNavigate();
  const { user, signOut, refreshUser } = useClientAuth();

  // ── Infos générales ──────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullname, setFullname] = useState(user?.fullname ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Madagascar');

  // ── Mot de passe ─────────────────────────────────────────────────────────
  const [changingPwd, setChangingPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  // ── Avatar ────────────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Activité ──────────────────────────────────────────────────────────────
  const [activityStats, setActivityStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    setFullname(user.fullname ?? '');
    setPhone(user.phone ?? '');
    setAvatarUrl(user.avatar_url ?? '');
    getMe().then(u => {
      setBio(u.profile?.bio ?? '');
      setAddress(u.profile?.address ?? '');
      setCity(u.profile?.city ?? '');
      setCountry(u.profile?.country ?? 'Madagascar');
    }).catch(() => {});
    const token = localStorage.getItem('arenah_token');
    fetch('/api/payments/my', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: { booking_type: string }[]) => {
        const counts: Record<string, number> = {};
        for (const p of Array.isArray(data) ? data : []) {
          const t = p.booking_type ?? 'autre';
          counts[t] = (counts[t] ?? 0) + 1;
        }
        setActivityStats(counts);
      })
      .catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <User className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground">Vous devez être connecté pour accéder à votre profil.</p>
        <Button asChild><Link to="/login">Se connecter</Link></Button>
      </div>
    );
  }

  const initials = (user.fullname ?? user.email ?? '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMe({ fullname, phone, bio, address, city, country });
      if (refreshUser) await refreshUser();
      setEditing(false);
      toast.success('Profil mis à jour');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Image trop lourde (max 3 Mo)'); return; }
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem('arenah_token');
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur upload');
      setAvatarUrl(data.url);
      if (refreshUser) await refreshUser();
      toast.success('Photo de profil mise à jour !');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleChangePwd = async () => {
    if (newPwd.length < 6) { toast.error('Le mot de passe doit avoir au moins 6 caractères'); return; }
    if (newPwd !== confirmPwd) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setSavingPwd(true);
    try {
      await updateMe({ password: newPwd });
      setChangingPwd(false);
      setNewPwd('');
      setConfirmPwd('');
      toast.success('Mot de passe modifié');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  const roleBadge = (role: string) => {
    if (role === 'super_admin') return <Badge className="bg-purple-600 text-white">Super Admin</Badge>;
    if (role === 'admin_module') return <Badge className="bg-blue-600 text-white">Admin</Badge>;
    return <Badge variant="secondary">Client</Badge>;
  };

  // Complétion du profil
  const profileFields = [
    { label: 'Nom complet', done: !!user.fullname },
    { label: 'Email', done: !!user.email },
    { label: 'Téléphone', done: !!phone },
    { label: 'Photo de profil', done: !!avatarUrl },
    { label: 'Bio', done: !!bio },
    { label: 'Adresse', done: !!address },
    { label: 'Ville', done: !!city },
  ];
  const completionPct = Math.round((profileFields.filter(f => f.done).length / profileFields.length) * 100);
  const missingFields = profileFields.filter(f => !f.done);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header profil */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="w-20 h-20 text-2xl">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFile}
          />
        </div>

        <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl">{user.fullname ?? 'Mon profil'}</h1>
              {roleBadge(user.role)}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user.email}</span>
              {user.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{user.phone}</span>}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" /> Compte vérifié
            </div>
            {/* Complétion profil */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Profil complété</span>
                <span className={`text-xs font-bold ${completionPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{completionPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden w-48">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${completionPct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              {completionPct < 100 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Manquant : {missingFields.map(f => f.label).join(', ')}
                </p>
              )}
            </div>
          </div>

        <Button variant="outline" onClick={handleLogout} className="gap-2 shrink-0">
          <LogOut className="w-4 h-4" /> Déconnexion
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="mb-6">
          <TabsTrigger value="info"><User className="w-3.5 h-3.5 mr-1.5" />Informations</TabsTrigger>
          <TabsTrigger value="security"><Lock className="w-3.5 h-3.5 mr-1.5" />Sécurité</TabsTrigger>
          <TabsTrigger value="shortcuts"><Package className="w-3.5 h-3.5 mr-1.5" />Raccourcis</TabsTrigger>
        </TabsList>

        {/* ── Onglet informations ──────────────────────────────────────── */}
        <TabsContent value="info">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">Informations personnelles</h2>
              {!editing ? (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" /> Modifier
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom complet</Label>
                {editing
                  ? <Input value={fullname} onChange={e => setFullname(e.target.value)} />
                  : <p className="text-sm py-2 px-3 rounded-lg bg-muted">{fullname || '—'}</p>
                }
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <p className="text-sm py-2 px-3 rounded-lg bg-muted text-muted-foreground">{user.email}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                {editing
                  ? <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+261 …" />
                  : <p className="text-sm py-2 px-3 rounded-lg bg-muted">{phone || '—'}</p>
                }
              </div>
              <div className="space-y-1.5">
                <Label>Pays</Label>
                {editing
                  ? <Input value={country} onChange={e => setCountry(e.target.value)} />
                  : <p className="text-sm py-2 px-3 rounded-lg bg-muted">{country || '—'}</p>
                }
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Adresse</Label>
                {editing
                  ? <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Votre adresse" />
                  : <p className="text-sm py-2 px-3 rounded-lg bg-muted">{address || '—'}</p>
                }
              </div>
              <div className="space-y-1.5">
                <Label>Ville</Label>
                {editing
                  ? <Input value={city} onChange={e => setCity(e.target.value)} />
                  : <p className="text-sm py-2 px-3 rounded-lg bg-muted">{city || '—'}</p>
                }
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Bio</Label>
                {editing
                  ? <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      rows={3}
                      className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Quelques mots sur vous…"
                    />
                  : <p className="text-sm py-2 px-3 rounded-lg bg-muted min-h-[4rem]">{bio || '—'}</p>
                }
              </div>
            </div>

            {editing && (
              <div className="mt-5 flex justify-end gap-2">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer les modifications
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Onglet sécurité ──────────────────────────────────────────── */}
        <TabsContent value="security">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-lg mb-5 flex items-center gap-2">
              <Lock className="w-5 h-5" /> Sécurité du compte
            </h2>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border mb-4">
              <div>
                <p className="font-medium">Mot de passe</p>
                <p className="text-sm text-muted-foreground">Changer votre mot de passe</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setChangingPwd(v => !v)}>
                {changingPwd ? 'Annuler' : 'Modifier'}
              </Button>
            </div>

            {changingPwd && (
              <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
                <div className="space-y-1.5">
                  <Label>Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Minimum 6 caractères"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirmer le mot de passe</Label>
                  <Input
                    type="password"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Répétez le mot de passe"
                  />
                </div>
                <Button onClick={handleChangePwd} disabled={savingPwd} className="w-full gap-2">
                  {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Changer le mot de passe
                </Button>
              </div>
            )}

            <Separator className="my-6" />

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <p className="font-medium">Compte sécurisé</p>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                Vos données sont protégées et chiffrées. Paiements sécurisés via MVola, Orange Money, Airtel.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── Onglet raccourcis ─────────────────────────────────────────── */}
        <TabsContent value="shortcuts">
          {/* Activité ARENAH */}
          {Object.keys(activityStats).length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 mb-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Mon activité ARENAH
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(activityStats).map(([type, count]) => {
                  const LABELS: Record<string, string> = {
                    boutique: '🛍️ Boutique', restaurant: '🍽️ Restaurant', hotel: '🏨 Hôtel',
                    gym: '💪 Gym', gym_coach: '🏋️ Coach', salon: '✂️ Salon',
                    pool: '🏊 Piscine', pool_course: '🌊 Cours piscine',
                    field: '⚽ Terrain', event: '🎪 Événementiel',
                    cybercafe: '💻 Cybercafé', show: '🎭 Spectacles',
                  };
                  return (
                    <div key={type} className="rounded-xl bg-muted/50 border border-border p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{count}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{LABELS[type] ?? type}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                <span className="font-semibold text-foreground">{Object.values(activityStats).reduce((s, n) => s + n, 0)}</span> transaction{Object.values(activityStats).reduce((s, n) => s + n, 0) > 1 ? 's' : ''} au total sur ARENAH
              </p>
            </div>
          )}

          {/* Programme fidélité */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-lg mb-4">Programme fidélité</h2>
            <LoyaltyCard />
          </div>

          {/* Notifications push */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-lg mb-4">Notifications</h2>
            <PushToggle />
            <p className="text-xs text-muted-foreground mt-2">Recevez une alerte dès que votre paiement est confirmé</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-lg mb-5">Accès rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Mes commandes & réservations', desc: 'Suivre toutes vos activités', Icon: Package, to: '/mes-commandes' },
                { label: 'Historique des paiements', desc: 'MVola, Orange Money, Airtel…', Icon: CreditCard, to: '/mes-paiements' },
                { label: 'Mes favoris', desc: 'Produits sauvegardés', Icon: FileText, to: '/favoris' },
                { label: 'Notifications', desc: 'Alertes et messages', Icon: MapPin, to: '/notifications' },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <item.Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientProfile;
