import { Card } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { ModulePerformance } from '@/types/super-admin';

const COLORS = ['#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6'];

export function ModulePerformanceChart({ data }: { data?: ModulePerformance[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">Performance par module</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data ?? []}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="module" interval={0} angle={-30} textAnchor="end" height={60} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function RevenueShareChart({ data }: { data?: ModulePerformance[] }) {
  const slices = (data ?? []).filter(d => d.value > 0);
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">Répartition des revenus</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices.length ? slices : [{ module: 'Aucune donnée', value: 1 }]}
              dataKey="value" nameKey="module" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {(slices.length ? slices : [{ module: '—', value: 1 }]).map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
