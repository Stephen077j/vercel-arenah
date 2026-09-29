import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useClientAuth } from '@/client/lib/clientAuth';

export function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useClientAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'super_admin') return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}
