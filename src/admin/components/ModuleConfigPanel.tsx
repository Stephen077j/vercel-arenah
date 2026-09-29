import { useEffect, useState } from 'react';
import { Save, Loader2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ConfigField {
  key: string;
  label: string;
  type?: 'number' | 'text';
  suffix?: string;
  min?: number;
  step?: number;
}

interface Props {
  module: string;
  fields: ConfigField[];
  color?: string;
}

function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin/config${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function ModuleConfigPanel({ module, fields, color = '#d4a843' }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('GET', `/${module}/config`).then(data => {
      if (data && !data.error) setValues(data);
      setLoading(false);
    });
  }, [module]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api('PUT', `/${module}/config`, values);
      if (res.error) { toast.error(res.error); return; }
      toast.success('Paramètres sauvegardés');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6"/></div>;

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-5 max-w-lg"
      style={{ borderColor: color + '33' }}>
      <div className="flex items-center gap-2">
        <Settings2 className="w-4 h-4" style={{ color }}/>
        <h3 className="font-semibold">Paramètres du module</h3>
      </div>

      <div className="space-y-4">
        {fields.map(f => (
          <div key={f.key} className="space-y-1">
            <Label>{f.label}</Label>
            <div className="flex items-center gap-2">
              <Input
                type={f.type ?? 'number'}
                value={values[f.key] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                min={f.min ?? 0}
                step={f.step ?? 1}
                className="h-9 max-w-xs"
              />
              {f.suffix && <span className="text-sm text-muted-foreground">{f.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} style={{ background: color, color: '#000' }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
        Sauvegarder
      </Button>
    </div>
  );
}
