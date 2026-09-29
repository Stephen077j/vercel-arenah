import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  settingsApi, ALL_MODULES, MODULE_LABELS,
  type PlatformSettings, type ModuleName,
} from '@/api/settings';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function SuperAdminPlatformSettings() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: settingsApi.get,
  });

  const [form, setForm] = useState<PlatformSettings | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const mutation = useMutation({
    mutationFn: (s: PlatformSettings) => settingsApi.update(s),
    onSuccess: (saved) => {
      toast.success('Paramètres enregistrés');
      setForm(saved);
      qc.invalidateQueries({ queryKey: ['platform-settings'] });
      qc.invalidateQueries({ queryKey: ['super-admin-dashboard'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="p-8 text-sm text-destructive">
        Impossible de charger les paramètres : {(error as Error)?.message ?? 'réponse vide'}
      </div>
    );
  }

  const set = <K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) =>
    setForm({ ...form, [k]: v });

  const toggleModule = (m: ModuleName, on: boolean) =>
    set('active_modules', on
      ? [...form.active_modules, m]
      : form.active_modules.filter(x => x !== m));

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres plateforme</h1>
          <p className="text-muted-foreground mt-1">Configuration globale — appliquée par l'API</p>
        </div>
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
          {mutation.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

      {form.maintenance_mode && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Mode maintenance actif</p>
            <p className="text-muted-foreground mt-0.5">
              Les clients ne peuvent plus commander ni réserver. La consultation reste
              possible, et vous gardez un accès complet en tant que super admin.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Accès à la plateforme" delay={0}>
          <Row label="Mode maintenance" hint="Bloque commandes et réservations">
            <Switch
              checked={form.maintenance_mode}
              onCheckedChange={(v) => set('maintenance_mode', v)}
            />
          </Row>
          <Row label="Inscriptions ouvertes" hint="Autorise la création de comptes client">
            <Switch
              checked={form.registration_enabled}
              onCheckedChange={(v) => set('registration_enabled', v)}
            />
          </Row>
          <Row
            label="Réservations max / client"
            hint="Enregistré, pas encore appliqué par l'API"
          >
            <Input
              type="number"
              min={1}
              value={form.max_bookings_per_user}
              onChange={(e) => set('max_bookings_per_user', parseInt(e.target.value) || 1)}
            />
          </Row>
        </Section>

        <Section title="Canaux de notification" delay={0.05}>
          <Row label="Email" hint="Confirmations et rappels J-1">
            <Switch
              checked={form.email_notifications_enabled}
              onCheckedChange={(v) => set('email_notifications_enabled', v)}
            />
          </Row>
          <Row label="Push" hint="Notifications navigateur">
            <Switch
              checked={form.push_notifications_enabled}
              onCheckedChange={(v) => set('push_notifications_enabled', v)}
            />
          </Row>
          <Row label="SMS" hint="Nécessite les identifiants Infobip">
            <Switch
              checked={form.sms_notifications_enabled}
              onCheckedChange={(v) => set('sms_notifications_enabled', v)}
            />
          </Row>
        </Section>

        <motion.div
          className="md:col-span-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="font-semibold">Modules ouverts</h2>
              <Badge variant="secondary">
                {form.active_modules.length} / {ALL_MODULES.length} actifs
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              {ALL_MODULES.map((m) => (
                <div key={m} className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-normal">{MODULE_LABELS[m]}</Label>
                  <Switch
                    checked={form.active_modules.includes(m)}
                    onCheckedChange={(v) => toggleModule(m, v)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-5">
        <h2 className="font-semibold mb-4">{title}</h2>
        <div className="space-y-4">{children}</div>
      </Card>
    </motion.div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Label className="text-sm font-normal">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="min-w-[120px] flex justify-end shrink-0">{children}</div>
    </div>
  );
}
