import React, {
  createContext, useContext, useState, useEffect, ReactNode,
} from 'react';

type FontSize = 'Small' | 'Medium' | 'Large';

// Device-level accessibility toggles, applied as <body> classes + persisted.
export interface AccessibilitySettings {
  highContrast:   boolean;
  reducedMotion:  boolean;
  screenReader:   boolean;
  dyslexiaFont:   boolean;
}

const DEFAULT_A11Y: AccessibilitySettings = {
  highContrast:  false,
  reducedMotion: false,
  screenReader:  false,
  dyslexiaFont:  false,
};

interface ThemeContextValue {
  darkMode:    boolean;
  setDarkMode: (v: boolean) => void;
  fontSize:    FontSize;
  setFontSize: (v: FontSize) => void;
  a11y:        AccessibilitySettings;
  setA11y:     (key: keyof AccessibilitySettings, value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  darkMode:    false,
  setDarkMode: () => {},
  fontSize:    'Medium',
  setFontSize: () => {},
  a11y:        DEFAULT_A11Y,
  setA11y:     () => {},
});

export const useTheme = () => useContext(ThemeContext);

// ── localStorage helpers (appearance is device-level, not per account) ────────
const A11Y_KEY      = 'unicinema:a11y';
const DARK_KEY      = 'unicinema:darkMode';
const FONT_KEY      = 'unicinema:fontSize';

const loadA11y = (): AccessibilitySettings => {
  try {
    const raw = localStorage.getItem(A11Y_KEY);
    return raw ? { ...DEFAULT_A11Y, ...JSON.parse(raw) } : DEFAULT_A11Y;
  } catch { return DEFAULT_A11Y; }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const raw = localStorage.getItem(DARK_KEY);
    return raw === null ? true : raw === 'true';
  });
  const [fontSize, setFontSize] = useState<FontSize>(
    () => (localStorage.getItem(FONT_KEY) as FontSize) || 'Medium',
  );
  const [a11y, setA11yState] = useState<AccessibilitySettings>(loadA11y);

  const setA11y = (key: keyof AccessibilitySettings, value: boolean) =>
    setA11yState(prev => ({ ...prev, [key]: value }));

  // Apply dark/light class to <body>
  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
    localStorage.setItem(DARK_KEY, String(darkMode));
  }, [darkMode]);

  // Apply font size to <html>
  useEffect(() => {
    const sizes: Record<FontSize, string> = {
      Small:  '13px',
      Medium: '15px',
      Large:  '17px',
    };
    document.documentElement.style.fontSize = sizes[fontSize];
    localStorage.setItem(FONT_KEY, fontSize);
  }, [fontSize]);

  // Apply accessibility classes to <body> + persist
  useEffect(() => {
    document.body.classList.toggle('a11y-contrast',  a11y.highContrast);
    document.body.classList.toggle('a11y-reduced-motion', a11y.reducedMotion);
    document.body.classList.toggle('a11y-screen-reader',  a11y.screenReader);
    document.body.classList.toggle('a11y-dyslexia',  a11y.dyslexiaFont);
    localStorage.setItem(A11Y_KEY, JSON.stringify(a11y));
  }, [a11y]);

  return (
    <ThemeContext.Provider
      value={{ darkMode, setDarkMode, fontSize, setFontSize, a11y, setA11y }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
