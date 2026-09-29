import { Card } from '@/components/ui/card';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlertItem } from '@/types/super-admin';

const iconMap = { critical: AlertCircle, warning: AlertTriangle, info: Info };
const toneMap = {
  critical: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  info: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
};

export function AlertsPanel({ alerts }: { alerts?: AlertItem[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">Alertes système</h3>
      {alerts && alerts.length ? (
        <ul className="space-y-2">
          {alerts.map(a => {
            const Icon = iconMap[a.type];
            return (
              <li key={a.id} className={cn('flex gap-3 p-3 rounded-lg border', toneMap[a.type])}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  {a.message && <div className="text-xs opacity-80 truncate">{a.message}</div>}
                  <div className="text-[10px] opacity-70 mt-1">
                    {new Date(a.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucune alerte active.</p>
      )}
    </Card>
  );
}
