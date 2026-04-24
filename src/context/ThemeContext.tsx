import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
export type ThemeMode = Theme | 'system';

interface ThemeContextValue {
  themeMode: ThemeMode;
  resolvedTheme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('themeMode');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<Theme>('dark');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const nextTheme: Theme =
        themeMode === 'system' ? (media.matches ? 'dark' : 'light') : themeMode;
      setResolvedTheme(nextTheme);

      const root = document.documentElement;
      if (nextTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const handleChange = () => {
      if (themeMode === 'system') applyTheme();
    };

    media.addEventListener('change', handleChange);
    localStorage.setItem('themeMode', themeMode);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, [themeMode]);

  // Backward compatibility for existing call sites.
  const toggleTheme = () => {
    setThemeMode((prev) => {
      if (prev === 'dark') return 'light';
      return 'dark';
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        setThemeMode,
        toggleTheme,
        isDark: resolvedTheme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
