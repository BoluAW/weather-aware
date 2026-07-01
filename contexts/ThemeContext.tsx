import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export type DisplayMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  displayMode: DisplayMode;
  isDark: boolean;
  setDisplayMode: (mode: DisplayMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  displayMode: 'system',
  isDark: false,
  setDisplayMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [displayMode, setDisplayModeState] = useState<DisplayMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('pref_display_mode').then((saved) => {
      if (saved) setDisplayModeState(saved as DisplayMode);
    });
  }, []);

  function setDisplayMode(mode: DisplayMode) {
    setDisplayModeState(mode);
    AsyncStorage.setItem('pref_display_mode', mode);
  }

  const isDark = displayMode === 'system' ? systemScheme === 'dark' : displayMode === 'dark';

  return (
    <ThemeContext.Provider value={{ displayMode, isDark, setDisplayMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Shared light/dark palette for the plain (non-gradient) screens.
export const palette = {
  light: {
    background: '#f3f4f6',
    surface: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e5e7eb',
    primary: '#1E78FF',
    accent: '#8B5CF6',
    glassBg: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    inputBg: '#ffffff',
    cardShadow: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
  },
  dark: {
    background: '#090d16',
    surface: '#131b2e',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#1f293d',
    primary: '#3B82F6',
    accent: '#a78bfa',
    glassBg: 'rgba(19, 27, 46, 0.65)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    inputBg: '#0f1424',
    cardShadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 4,
    },
  },
};

export function usePalette() {
  const { isDark } = useTheme();
  return isDark ? palette.dark : palette.light;
}
