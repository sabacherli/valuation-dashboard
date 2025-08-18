import * as React from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark';
  storageKey?: string;
}

const ThemeContext = React.createContext<{
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
} | null>(null);

export function ThemeProvider({ 
  children, 
  defaultTheme = 'light',
  storageKey = 'vite-ui-theme',
  ...props 
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<'light' | 'dark'>(defaultTheme);

  // Load theme from localStorage on mount
  React.useEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem(storageKey) as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply theme from localStorage or system preference
    if (storedTheme) {
      root.classList.toggle('dark', storedTheme === 'dark');
      setThemeState(storedTheme);
    } else if (systemPrefersDark) {
      root.classList.add('dark');
      setThemeState('dark');
    }
  }, [storageKey]);

  const setTheme = React.useCallback((newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    // Update class and localStorage
    root.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem(storageKey, newTheme);
    
    // Update state
    setThemeState(newTheme);
  }, [storageKey]);

  const value = React.useMemo(() => ({
    theme,
    setTheme,
  }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value} {...props}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
