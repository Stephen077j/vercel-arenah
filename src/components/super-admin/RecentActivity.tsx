import { Card } from '@/components/ui/card';
import type { ActivityItem } from '@/types/super-admin';

export function RecentActivity({ items }: { items?: ActivityItem[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">Activité récente</h3>
      {items && items.length ? (
        <ul className="divide-y divide-border">
          {items.map(it => (
            <li key={it.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{it.action}</span>
                {it.entity && <span className="text-muted-foreground"> · {it.entity}</span>}
                {it.actorEmail && <div className="text-xs text-muted-foreground truncate">{it.actorEmail}</div>}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(it.createdAt).toLocaleString('fr-FR')}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
      )}
    </Card>
  );
}
