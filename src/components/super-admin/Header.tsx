import { Bell, Search, User, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useClientAuth } from '@/client/lib/clientAuth';
import { SuperAdminSidebar } from '@/superadmin/components/SuperAdminSidebar';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { user } = useClientAuth();
  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-8 h-16">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-amber-500/10 [&>aside]:flex [&>aside]:w-full">
            <SuperAdminSidebar />
          </SheetContent>
        </Sheet>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            className="pl-9 bg-muted/40 border-border/60"
          />
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500" />
        </Button>
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-border/60">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-slate-950" />
          </div>
          <div className="hidden md:block text-xs">
            <div className="font-medium truncate max-w-[160px]">{user?.email ?? '—'}</div>
            <div className="text-muted-foreground">Super Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
