import { Outlet } from 'react-router-dom';
import { SuperAdminSidebar } from './components/SuperAdminSidebar';
import { RequireSuperAdmin } from './components/RequireSuperAdmin';
import { Header } from '@/components/super-admin/Header';
import { ThemeProvider } from '@/components/super-admin/ThemeProvider';

/**
 * Coquille unique du portail Super Admin : sidebar + en-tête.
 * Les pages rendues dans l'Outlet ne doivent pas se réenvelopper dans un
 * layout — cela dupliquerait la sidebar.
 */
export default function SuperAdminLayout() {
  return (
    <RequireSuperAdmin>
      <ThemeProvider>
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-foreground">
          <SuperAdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </ThemeProvider>
    </RequireSuperAdmin>
  );
}
