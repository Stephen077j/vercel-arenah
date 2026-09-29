import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'amber' | 'emerald' | 'sky' | 'violet' | 'rose';
  trend?: string;
  delay?: number;
}

const accentMap = {
  amber: 'from-amber-500/20 to-amber-500/5 text-amber-500',
  emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-500',
  sky: 'from-sky-500/20 to-sky-500/5 text-sky-500',
  violet: 'from-violet-500/20 to-violet-500/5 text-violet-500',
  rose: 'from-rose-500/20 to-rose-500/5 text-rose-500',
};

export function KpiCard({ label, value, icon: Icon, accent = 'amber', trend, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="p-5 relative overflow-hidden border-border/60 hover:shadow-lg transition-shadow">
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', accentMap[accent])} />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
              <div className="text-2xl font-bold mt-2">{value}</div>
              {trend && <div className="text-xs text-muted-foreground mt-1">{trend}</div>}
            </div>
            <div className={cn('h-10 w-10 rounded-xl bg-background/60 flex items-center justify-center', accentMap[accent].split(' ').pop())}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
