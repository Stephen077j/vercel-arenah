import { Card } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend,
} from 'recharts';
import type { RevenuePoint, UserGrowthPoint } from '@/types/super-admin';

export function RevenueChart({ data }: { data?: RevenuePoint[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">Évolution du chiffre d'affaires</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data ?? []}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function UserGrowthChart({ data }: { data?: UserGrowthPoint[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">Croissance des utilisateurs</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data ?? []}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
