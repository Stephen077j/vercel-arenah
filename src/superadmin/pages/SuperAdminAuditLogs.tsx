import { useEffect, useState } from 'react';
import { Loader2, ScrollText } from 'lucide-react';

interface AuditLog { id: string; action: string; user_id: string | null; details: string | null; created_at: string; }

function api(path: string) {
  const token = localStorage.getItem('arenah_token');
  return fetch(`/api/admin${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

export default function SuperAdminAuditLogs() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit]     = useState(100);

  const load = async () => {
    setLoading(true);
    const data = await api(`/audit-logs?limit=${limit}`);
    setLogs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [limit]); // eslint-disable-line

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-amber-400"/> Journaux d'audit
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Historique des actions importantes sur la plateforme</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}
            className="h-9 px-3 rounded-lg border text-xs bg-background">
            <option value={50}>50 dernières</option>
            <option value={100}>100 dernières</option>
            <option value={200}>200 dernières</option>
          </select>
          <button onClick={load} className="h-9 px-4 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">🔄</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin"/> Chargement…
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed rounded-xl">
          Aucune entrée dans les journaux d'audit.
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Utilisateur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className={`border-b hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-muted">{log.action}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{log.user_id ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{log.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
