import React, {
  createContext, useContext, useState, useEffect, ReactNode,
} from 'react';

type FontSize = 'Small' | 'Medium' | 'Large';

interface ThemeContextValue {
  darkMode:    boolean;
  setDarkMode: (v: boolean) => void;
  fontSize:    FontSize;
  setFontSize: (v: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  darkMode:    true,
  setDarkMode: () => {},
  fontSize:    'Medium',
  setFontSize: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState<FontSize>('Medium');

  // Apply dark/light class to <body>
  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
  }, [darkMode]);

  // Apply font size to <html>
  useEffect(() => {
    const sizes: Record<FontSize, string> = {
      Small:  '13px',
      Medium: '15px',
      Large:  '17px',
    };
    document.documentElement.style.fontSize = sizes[fontSize];
  }, [fontSize]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};
