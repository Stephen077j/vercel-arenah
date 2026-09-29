import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { RequireSuperAdmin } from '@/superadmin/components/RequireSuperAdmin';
import { ThemeProvider } from './ThemeProvider';

export function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSuperAdmin>
      <ThemeProvider>
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-foreground">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </ThemeProvider>
    </RequireSuperAdmin>
  );
}
