import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Dumbbell, User } from 'lucide-react';
import ModuleConfigPanel from '@/admin/components/ModuleConfigPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Plan { id: string; label: string; price: number; days: number; active: boolean; }
interface Coach { id: string; name: string; specialty: string | null; hour_price: number; active: boolean; }

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function AdminGymConfig() {
  const [plans, setPlans]   = useState<Plan[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'plans'|'coaches'|'config'>('plans');

  // Plans form
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editPlanId, setEditPlanId] = useState<string|null>(null);
  const [planLabel, setPlanLabel] = useState('');
  const [planPrice, setPlanPrice] = useState(80000);
  const [planDays, setPlanDays]   = useState(30);
  const [savingPlan, setSavingPlan] = useState(false);

  // Coaches form
  const [showCoachForm, setShowCoachForm] = useState(false);
  const [editCoachId, setEditCoachId] = useState<string|null>(null);
  const [coachName, setCoachName]       = useState('');
  const [coachSpec, setCoachSpec]       = useState('');
  const [coachRate, setCoachRate]       = useState(20000);
  const [savingCoach, setSavingCoach]   = useState(false);

  const load = async () => {
    setLoading(true);
    const [planData, coachData] = await Promise.all([api('GET','/gym/plans'), api('GET','/gym/coaches')]);
    setPlans(Array.isArray(planData) ? planData : []);
    setCoaches(Array.isArray(coachData) ? coachData : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetPlan = () => { setPlanLabel(''); setPlanPrice(80000); setPlanDays(30); setEditPlanId(null); setShowPlanForm(false); };
  const resetCoach = () => { setCoachName(''); setCoachSpec(''); setCoachRate(20000); setEditCoachId(null); setShowCoachForm(false); };

  const startEditPlan = (p: Plan) => { setPlanLabel(p.label); setPlanPrice(p.price); setPlanDays(p.days); setEditPlanId(p.id); setShowPlanForm(true); };
  const startEditCoach = (c: Coach) => { setCoachName(c.name); setCoachSpec(c.specialty??''); setCoachRate(c.hour_price); setEditCoachId(c.id); setShowCoachForm(true); };

  const savePlan = async () => {
    if (!planLabel.trim()) { toast.error('Libellé requis'); return; }
    setSavingPlan(true);
    try {
      const body = { label: planLabel, price: planPrice, days: planDays };
      const res = editPlanId ? await api('PUT', `/gym/plans/${editPlanId}`, body) : await api('POST', '/gym/plans', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editPlanId ? 'Plan mis à jour' : 'Plan ajouté');
      resetPlan(); load();
    } finally { setSavingPlan(false); }
  };

  const deletePlan = async (p: Plan) => {
    if (!confirm(`Désactiver le plan "${p.label}" ?`)) return;
    await api('DELETE', `/gym/plans/${p.id}`);
    toast.success('Plan désactivé'); load();
  };

  const saveCoach = async () => {
    if (!coachName.trim()) { toast.error('Nom requis'); return; }
    setSavingCoach(true);
    try {
      const body = { name: coachName, specialty: coachSpec, hour_price: coachRate };
      const res = editCoachId ? await api('PUT', `/gym/coaches/${editCoachId}`, { ...body, active: true }) : await api('POST', '/gym/coaches', body);
      if (res.error) { toast.error(res.error); return; }
      toast.success(editCoachId ? 'Coach mis à jour' : 'Coach ajouté');
      resetCoach(); load();
    } finally { setSavingCoach(false); }
  };

  const toggleCoach = async (c: Coach) => {
    await api('PUT', `/gym/coaches/${c.id}`, { name: c.name, specialty: c.specialty, hour_price: c.hour_price, active: !c.active });
    toast.success(c.active ? 'Coach désactivé' : 'Coach activé'); load();
  };

  const deleteCoach = async (c: Coach) => {
    if (!confirm(`Supprimer le coach "${c.name}" ?`)) return;
    await api('DELETE', `/gym/coaches/${c.id}`);
    toast.success('Coach supprimé'); load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8"/></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Dumbbell className="w-5 h-5 text-red-400"/>Gestion Gym & Sport</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{plans.length} plan(s) · {coaches.filter(c=>c.active).length} coach(s) actif(s)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {(['plans','coaches','config'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
            style={{ borderColor: tab===t ? '#f87171' : 'transparent', color: tab===t ? '#f87171' : undefined }}>
            {t === 'plans' ? '📋 Plans' : t === 'coaches' ? '🏋️ Coachs' : '⚙️ Paramètres'}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <ModuleConfigPanel
          module="gym"
          color="#f87171"
          fields={[
            { key:'capacite_max', label:'Capacité max simultanée (personnes)', suffix:'pers.', step:1, min:1 },
            { key:'prix_seance',  label:'Prix séance libre (Ar)',              suffix:'Ar',    step:500 },
          ]}
        />
      )}

      {/* PLANS */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <Button onClick={() => { resetPlan(); setShowPlanForm(true); }} size="sm" className="gap-2">
            <Plus className="w-4 h-4"/> Nouveau plan
          </Button>

          {showPlanForm && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-md">
              <h3 className="font-semibold">{editPlanId ? 'Modifier le plan' : 'Nouveau plan'}</h3>
              <div className="space-y-1">
                <Label>Libellé</Label>
                <Input value={planLabel} onChange={e => setPlanLabel(e.target.value)} placeholder="Ex: Abonnement annuel" className="h-9"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Prix (Ar)</Label>
                  <Input type="number" value={planPrice} onChange={e => setPlanPrice(Number(e.target.value))} min={0} step={5000} className="h-9"/>
                </div>
                <div className="space-y-1">
                  <Label>Durée (jours)</Label>
                  <Input type="number" value={planDays} onChange={e => setPlanDays(Number(e.target.value))} min={1} className="h-9"/>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={savePlan} disabled={savingPlan} style={{ background:'#f87171' }}>
                  {savingPlan ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
                  {editPlanId ? 'Mettre à jour' : `Créer · ${planPrice.toLocaleString()} Ar / ${planDays}j`}
                </Button>
                <Button variant="outline" onClick={resetPlan}><X className="w-4 h-4"/></Button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.id} className="rounded-2xl border bg-card p-4 space-y-3 border-red-400/30">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.days} jours</p>
                  </div>
                  <p className="font-bold text-red-400">{p.price.toLocaleString()} Ar</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => startEditPlan(p)}>
                    <Pencil className="w-3 h-3"/> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => deletePlan(p)}>
                    <Trash2 className="w-3 h-3"/>
                  </Button>
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="col-span-3 text-center py-10 border border-dashed border-border rounded-2xl text-muted-foreground">
                Aucun plan. Créez-en un.
              </div>
            )}
          </div>
        </div>
      )}

      {/* COACHES */}
      {tab === 'coaches' && (
        <div className="space-y-4">
          <Button onClick={() => { resetCoach(); setShowCoachForm(true); }} size="sm" className="gap-2">
            <Plus className="w-4 h-4"/> Nouveau coach
          </Button>

          {showCoachForm && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-md">
              <h3 className="font-semibold">{editCoachId ? 'Modifier le coach' : 'Nouveau coach'}</h3>
              <div className="space-y-1">
                <Label>Nom complet</Label>
                <Input value={coachName} onChange={e => setCoachName(e.target.value)} placeholder="Ex: Jean-Marc Razafy" className="h-9"/>
              </div>
              <div className="space-y-1">
                <Label>Spécialité</Label>
                <Input value={coachSpec} onChange={e => setCoachSpec(e.target.value)} placeholder="Ex: Musculation, Cardio, Yoga…" className="h-9"/>
              </div>
              <div className="space-y-1">
                <Label>Tarif horaire (Ar)</Label>
                <Input type="number" value={coachRate} onChange={e => setCoachRate(Number(e.target.value))} min={0} step={5000} className="h-9"/>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveCoach} disabled={savingCoach} style={{ background:'#f87171' }}>
                  {savingCoach ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
                  {editCoachId ? 'Mettre à jour' : `Ajouter · ${coachRate.toLocaleString()} Ar/h`}
                </Button>
                <Button variant="outline" onClick={resetCoach}><X className="w-4 h-4"/></Button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map(c => (
              <div key={c.id} className="rounded-2xl border bg-card p-4 space-y-3"
                style={{ borderColor: c.active ? '#f87171aa' : 'hsl(var(--border))', opacity: c.active ? 1 : 0.55 }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-red-400"/>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{c.name}</p>
                    {c.specialty && <p className="text-xs text-muted-foreground">{c.specialty}</p>}
                  </div>
                  <p className="ml-auto font-bold text-sm text-red-400">{c.hour_price.toLocaleString()} Ar/h</p>
                </div>
                {!c.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inactif</span>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => startEditCoach(c)}>
                    <Pencil className="w-3 h-3"/> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => toggleCoach(c)}>
                    {c.active ? '⏸' : '▶'}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => deleteCoach(c)}>
                    <Trash2 className="w-3 h-3"/>
                  </Button>
                </div>
              </div>
            ))}
            {coaches.length === 0 && (
              <div className="col-span-3 text-center py-10 border border-dashed border-border rounded-2xl text-muted-foreground">
                Aucun coach enregistré.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
