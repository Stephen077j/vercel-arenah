import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login, register, logout, getMe } from '@/api/auth';
import type { User } from '@/api/auth';

interface ClientAuthContextType {
  user: User | null;
  supabaseUser: null;       // conservé pour compatibilité — toujours null désormais
  loading: boolean;
  isAuthenticated: boolean;
  isLocalMode: boolean;     // conservé pour compatibilité — toujours false
  signIn:  (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  signUp:  (email: string, password: string, fullname: string, phone?: string, ref_code?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType | null>(null);

export const ClientAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Au démarrage : si un token existe, on charge le profil
  useEffect(() => {
    const token = localStorage.getItem('arenah_token');
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('arenah_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const u = await login(email, password);
      setUser(u);
      return { success: true, user: u };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      return { success: false, error: msg };
    }
  };

  const signUp = async (email: string, password: string, fullname: string, phone?: string, ref_code?: string) => {
    try {
      const u = await register(email, password, fullname, phone, ref_code);
      setUser(u);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  // no-op — plus de Supabase
  const resendConfirmationEmail = async (_email: string) => ({ success: true });

  return (
    <ClientAuthContext.Provider value={{
      user,
      supabaseUser: null,
      loading,
      isAuthenticated: !!user,
      isLocalMode: false,
      signIn,
      signUp,
      signOut,
      resendConfirmationEmail,
      refreshUser,
    }}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error('useClientAuth must be used within ClientAuthProvider');
  return ctx;
};
