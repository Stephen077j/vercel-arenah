import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'arenah_theme';

function apply(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}

interface ThemeCtx { theme: Theme; toggle: () => void; }
const Ctx = createContext<ThemeCtx>({ theme: 'light', toggle: () => {} });

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => { apply(theme); localStorage.setItem(KEY, theme); }, [theme]);

  const toggle = () => setThemeState(t => t === 'dark' ? 'light' : 'dark');

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
};

export const useTheme = () => useContext(Ctx);
