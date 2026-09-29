import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, Check, X, Loader2, Search,
  UserCheck, UserX, Users, ShieldCheck, Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  fullname: string | null;
  phone: string | null;
  role: string;
  module_assigned: string | null;
  active: boolean;
  created_at: string;
  payment_count: number;
  total_spent: number;
}

const ROLES = [
  { value: 'client',      label: 'Client',       color: '#64748b' },
  { value: 'caissier',    label: 'Caissier',     color: '#3b82f6' },
  { value: 'admin_module',label: 'Admin Module', color: '#f59e0b' },
  { value: 'proprietaire',label: 'Propriétaire', color: '#8b5cf6' },
  { value: 'super_admin', label: 'Super Admin',  color: '#ef4444' },
];

const MODULES = [
  'boutique','restaurant','hotel','gym','salon','field','pool','event','spectacles','cybercafe','kids',
];

const MODULE_EMOJI: Record<string, string> = {
  boutique:'🛍️', restaurant:'🍽️', hotel:'🏨', gym:'💪', salon:'✂️',
  field:'⚽', pool:'🏊', event:'🏛️', spectacles:'🎭', cybercafe:'🖥️', kids:'🎠',
};

function accessDescription(role: string, module: string | null): string {
  switch (role) {
    case 'super_admin':
      return 'Accès total — gère tous les modules, tous les utilisateurs, tout l\'historique';
    case 'admin_module':
      return module
        ? `Gère ${MODULE_EMOJI[module]??''} ${module} — voit les réservations, clients, analytics et config du module`
        : 'Admin module (aucun module assigné — vérifier)';
    case 'caissier':
      return 'Caisse — traite les paiements et encaissements sur place';
    case 'proprietaire':
      return 'Propriétaire — tableau de bord financier global en lecture seule';
    case 'client':
      return 'Self-service — voit uniquement ses propres réservations et commandes';
    default:
      return role;
  }
}

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

function roleBadge(role: string) {
  const meta = ROLES.find(r => r.value === role);
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px',
      borderRadius:6, fontSize:11, fontWeight:600,
      background: (meta?.color ?? '#64748b') + '22',
      color: meta?.color ?? '#64748b',
      border: `1px solid ${(meta?.color ?? '#64748b')}44`,
    }}>
      {role === 'super_admin' && <Crown size={10}/>}
      {meta?.label ?? role}
    </span>
  );
}

const BLANK_FORM = { email:'', fullname:'', phone:'', role:'client', module_assigned:'', password:'' };

export default function SuperAdminUsers() {
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string|null>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)     params.set('q', search);
    if (filterRole) params.set('role', filterRole);
    const data = await api('GET', `/users?${params}`);
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, filterRole]); // eslint-disable-line

  const resetForm = () => { setForm(BLANK_FORM); setEditId(null); setShowForm(false); };

  const startEdit = (u: User) => {
    setForm({ email: u.email, fullname: u.fullname??'', phone: u.phone??'', role: u.role, module_assigned: u.module_assigned??'', password: '' });
    setEditId(u.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.email.trim()) { toast.error('Email requis'); return; }
    if (!editId && !form.password.trim()) { toast.error('Mot de passe requis pour un nouveau compte'); return; }
    setSaving(true);
    try {
      const body = {
        email: form.email.trim(),
        fullname: form.fullname.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role,
        module_assigned: (form.role === 'admin_module' && form.module_assigned) ? form.module_assigned : null,
        ...(form.password.trim() ? { password: form.password } : {}),
      };
      const res = editId
        ? await api('PUT', `/users/${editId}`, body)
        : await api('POST', '/users', { ...body, password: form.password });
      if (res.error) { toast.error(res.error); return; }
      toast.success(editId ? 'Utilisateur mis à jour' : 'Utilisateur créé');
      resetForm(); load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (u: User) => {
    const res = await api('PUT', `/users/${u.id}`, { active: !u.active });
    if (res.error) { toast.error(res.error); return; }
    toast.success(u.active ? 'Compte désactivé' : 'Compte réactivé');
    load();
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Désactiver définitivement le compte "${u.email}" ?`)) return;
    const res = await api('DELETE', `/users/${u.id}`);
    if (res.error) { toast.error(res.error); return; }
    toast.success('Compte désactivé');
    load();
  };

  const stats = {
    total:  users.length,
    active: users.filter(u => u.active).length,
    admins: users.filter(u => ['admin_module','super_admin'].includes(u.role)).length,
    clients: users.filter(u => u.role === 'client').length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400"/> Gestion des utilisateurs
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Créer, modifier, activer/désactiver tous les comptes
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Plus className="w-4 h-4"/> Nouveau compte
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total',   value: stats.total,   color:'#64748b' },
          { label:'Actifs',  value: stats.active,  color:'#22c55e' },
          { label:'Admins',  value: stats.admins,  color:'#f59e0b' },
          { label:'Clients', value: stats.clients, color:'#3b82f6' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Formulaire création/édition */}
      {showForm && (
        <div className="rounded-2xl border border-amber-500/30 bg-card p-5 space-y-4 max-w-xl shadow-lg">
          <h3 className="font-bold text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400"/>
            {editId ? 'Modifier le compte' : 'Créer un compte'}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Email *</Label>
              <Input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                placeholder="prenom.nom@example.com" className="h-9" type="email"/>
            </div>
            <div className="space-y-1">
              <Label>Nom complet</Label>
              <Input value={form.fullname} onChange={e => setForm(f => ({...f, fullname: e.target.value}))}
                placeholder="Prénom Nom" className="h-9"/>
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                placeholder="+261 34 000 0000" className="h-9"/>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Rôle *</Label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setForm(f => ({...f, role: r.value}))}
                  className="px-3 py-1.5 rounded-xl text-xs border font-semibold transition-all"
                  style={{
                    borderColor: form.role === r.value ? r.color : 'hsl(var(--border))',
                    background:  form.role === r.value ? r.color + '22' : undefined,
                    color:       form.role === r.value ? r.color : undefined,
                  }}>
                  {r.value === 'super_admin' && '👑 '}{r.label}
                </button>
              ))}
            </div>
          </div>

          {form.role === 'admin_module' && (
            <div className="space-y-1">
              <Label>Module assigné</Label>
              <div className="flex flex-wrap gap-2">
                {MODULES.map(m => (
                  <button key={m} onClick={() => setForm(f => ({...f, module_assigned: m}))}
                    className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                    style={{
                      borderColor: form.module_assigned === m ? '#f59e0b' : 'hsl(var(--border))',
                      background:  form.module_assigned === m ? '#f59e0b22' : undefined,
                      color:       form.module_assigned === m ? '#f59e0b' : undefined,
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>{editId ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}</Label>
            <Input value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
              placeholder={editId ? '••••••••' : 'Min. 8 caractères'} className="h-9" type="password"/>
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
              {editId ? 'Enregistrer' : 'Créer le compte'}
            </Button>
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4"/></Button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher email ou nom…"
            className="pl-9 h-9 w-64"/>
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterRole('')}
            className="px-3 py-1.5 rounded-lg text-xs border transition-all"
            style={{ background: filterRole==='' ? '#f59e0b22' : undefined, borderColor: filterRole==='' ? '#f59e0b' : 'hsl(var(--border))', color: filterRole==='' ? '#f59e0b' : undefined }}>
            Tous ({users.length})
          </button>
          {ROLES.map(r => {
            const count = users.filter(u => u.role === r.value).length;
            if (count === 0) return null;
            return (
              <button key={r.value} onClick={() => setFilterRole(r.value === filterRole ? '' : r.value)}
                className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                style={{ background: filterRole===r.value ? r.color+'22' : undefined, borderColor: filterRole===r.value ? r.color : 'hsl(var(--border))', color: filterRole===r.value ? r.color : undefined }}>
                {r.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Comptes groupés par rôle */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin"/> Chargement…
        </div>
      ) : (
        <div className="space-y-6">
          {ROLES.map(roleGroup => {
            const group = users.filter(u =>
              u.role === roleGroup.value &&
              (!search || u.email.toLowerCase().includes(search.toLowerCase()) || (u.fullname??'').toLowerCase().includes(search.toLowerCase()))
            );
            if (group.length === 0) return null;
            return (
              <div key={roleGroup.value}>
                {/* En-tête du groupe */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1" style={{ background: roleGroup.color + '44' }}/>
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
                    style={{ color: roleGroup.color, borderColor: roleGroup.color + '44', background: roleGroup.color + '11' }}>
                    {roleGroup.value === 'super_admin' && '👑 '}
                    {roleGroup.label} — {group.length} compte{group.length > 1 ? 's' : ''}
                  </span>
                  <div className="h-px flex-1" style={{ background: roleGroup.color + '44' }}/>
                </div>

                {/* Description des accès pour ce groupe */}
                <div className="mb-3 px-4 py-2.5 rounded-lg text-xs text-muted-foreground border border-dashed"
                  style={{ borderColor: roleGroup.color + '33', background: roleGroup.color + '08' }}>
                  <span className="font-semibold" style={{ color: roleGroup.color }}>Ce que ce rôle peut voir : </span>
                  {accessDescription(roleGroup.value, null)}
                </div>

                {/* Cards des comptes */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map(u => (
                    <div key={u.id} className="rounded-xl border bg-card p-4 space-y-3 transition-all hover:shadow-sm"
                      style={{ borderColor: u.active ? roleGroup.color + '33' : 'hsl(var(--border))', opacity: u.active ? 1 : 0.6 }}>
                      {/* Header compte */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{u.fullname ?? u.email.split('@')[0]}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        {u.active
                          ? <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 font-semibold">Actif</span>
                          : <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-semibold">Désactivé</span>}
                      </div>

                      {/* Accès spécifique */}
                      {u.role === 'admin_module' && u.module_assigned && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: roleGroup.color + '15', color: roleGroup.color }}>
                          <span style={{ fontSize: 16 }}>{MODULE_EMOJI[u.module_assigned] ?? '📦'}</span>
                          <div>
                            <span className="uppercase tracking-wider">{u.module_assigned}</span>
                            <span className="font-normal text-[10px] block opacity-75">Voit réservations + clients + config</span>
                          </div>
                        </div>
                      )}

                      {u.role === 'super_admin' && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: '#ef444415', color: '#ef4444' }}>
                          <Crown size={14}/>
                          <span>Accès total à tout</span>
                        </div>
                      )}

                      {/* Dépenses client */}
                      {u.role === 'client' && Number(u.total_spent) > 0 && (
                        <p className="text-xs text-green-500 font-semibold">
                          {Number(u.total_spent).toLocaleString()} Ar dépensés · {u.payment_count} paiement(s)
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1.5 pt-1 border-t border-border/50">
                        <button onClick={() => startEdit(u)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs border hover:bg-muted transition-colors font-medium">
                          <Pencil size={11}/> Modifier
                        </button>
                        <button onClick={() => handleToggle(u)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors font-medium"
                          style={{ color: u.active ? '#ef4444' : '#22c55e', borderColor: u.active ? '#ef444433' : '#22c55e33' }}
                          title={u.active ? 'Désactiver' : 'Réactiver'}>
                          {u.active ? <UserX size={11}/> : <UserCheck size={11}/>}
                        </button>
                        {u.role !== 'super_admin' && (
                          <button onClick={() => handleDelete(u)}
                            className="flex items-center justify-center px-2.5 py-1.5 rounded-lg text-xs border border-red-200 text-red-400 hover:bg-red-50 transition-colors"
                            title="Désactiver définitivement">
                            <Trash2 size={11}/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {users.filter(u =>
            (!search || u.email.toLowerCase().includes(search.toLowerCase()) || (u.fullname??'').toLowerCase().includes(search.toLowerCase()))
          ).length === 0 && (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
              Aucun compte correspondant
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">{users.length} compte(s) au total</p>
    </div>
  );
}
