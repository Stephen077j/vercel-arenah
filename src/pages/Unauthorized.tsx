import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function Unauthorized() {
  const signOutAndGo = async () => {
    await supabase.auth.signOut();
    window.location.href = '/super-admin/login';
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-md w-full text-center text-slate-100 space-y-5">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
          <ShieldX className="h-8 w-8 text-rose-400" />
        </div>
        <h1 className="text-2xl font-bold">Accès refusé</h1>
        <p className="text-slate-400 text-sm">
          Votre compte n'a pas les privilèges <span className="text-amber-400 font-medium">Super Admin</span>
          {' '}requis pour accéder à cette zone.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild variant="outline">
            <Link to="/">Retour au site</Link>
          </Button>
          <Button onClick={signOutAndGo} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
            Se reconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
