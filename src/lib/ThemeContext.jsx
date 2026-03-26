/**
 * ThemeContext — Dynamic per-section theme engine.
 * Detects current route, applies the section's color tokens to :root CSS variables live.
 * Also manages Light / Dark / High-Contrast mode.
 * Persists user preferences in localStorage.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Section theme definitions (HSL values matching index.css pattern)
const SECTION_THEMES = {
  '/calving': {
    name: 'calving',
    primary:    '142 50% 32%',
    ring:       '142 50% 32%',
    accent:     '142 45% 45%',
    headerBg:   'hsla(142,30%,15%,0.97)',
    headerText: '#ffffff',
    tabColor:   'text-emerald-600',
  },
  '/sorting': {
    name: 'sorting',
    primary:    '205 70% 38%',
    ring:       '205 70% 38%',
    accent:     '205 65% 50%',
    headerBg:   'hsla(205,55%,14%,0.97)',
    headerText: '#ffffff',
    tabColor:   'text-blue-600',
  },
  '/pastures': {
    name: 'pastures',
    primary:    '25 40% 38%',
    ring:       '25 40% 38%',
    accent:     '25 35% 50%',
    headerBg:   'hsla(25,30%,15%,0.97)',
    headerText: '#ffffff',
    tabColor:   'text-amber-700',
  },
};

const HOME_THEME = {
  name: 'home',
  primary:    '142 40% 32%',
  ring:       '142 40% 32%',
  accent:     '205 55% 42%',
  headerBg:   null, // uses CSS var default
  headerText: null,
};

const DARK_OVERRIDES = {
  background: '150 15% 8%',
  foreground: '40 20% 95%',
  card:       '150 15% 12%',
  border:     '150 10% 20%',
  muted:      '150 10% 18%',
};

const LIGHT_OVERRIDES = {
  background: '40 20% 97%',
  foreground: '150 20% 10%',
  card:       '0 0% 100%',
  border:     '40 15% 85%',
  muted:      '40 15% 93%',
};

const HIGH_CONTRAST_OVERRIDES = {
  background: '0 0% 100%',
  foreground: '0 0% 0%',
  card:       '0 0% 100%',
  border:     '0 0% 0%',
  muted:      '0 0% 92%',
};

const ThemeCtx = createContext({
  mode: 'light',
  setMode: () => {},
  sectionTheme: HOME_THEME,
  headerStyle: {},
});

export function ThemeProvider({ children }) {
  const location = useLocation();
  const [mode, setModeState] = useState(() => localStorage.getItem('rm_theme_mode') || 'light');

  // Derive section theme from current path
  const sectionKey = Object.keys(SECTION_THEMES).find(k => location.pathname.startsWith(k));
  const sectionTheme = sectionKey ? SECTION_THEMES[sectionKey] : HOME_THEME;

  const applyMode = useCallback((m) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    if (m === 'dark') {
      root.classList.add('dark');
      Object.entries(DARK_OVERRIDES).forEach(([k, v]) =>
        root.style.setProperty(`--${k}`, v)
      );
    } else if (m === 'high-contrast') {
      root.classList.add('high-contrast');
      Object.entries(HIGH_CONTRAST_OVERRIDES).forEach(([k, v]) =>
        root.style.setProperty(`--${k}`, v)
      );
    } else {
      Object.entries(LIGHT_OVERRIDES).forEach(([k, v]) =>
        root.style.setProperty(`--${k}`, v)
      );
    }
  }, []);

  const setMode = useCallback((m) => {
    setModeState(m);
    localStorage.setItem('rm_theme_mode', m);
    applyMode(m);
  }, [applyMode]);

  // Apply mode on mount & whenever it changes
  useEffect(() => { applyMode(mode); }, [mode, applyMode]);

  // Apply section primary/accent tokens on route change
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', sectionTheme.primary);
    root.style.setProperty('--ring',    sectionTheme.ring);
    root.style.setProperty('--accent',  sectionTheme.accent);
  }, [sectionTheme]);

  const headerStyle = sectionTheme.headerBg
    ? { background: sectionTheme.headerBg, color: sectionTheme.headerText }
    : {};

  return (
    <ThemeCtx.Provider value={{ mode, setMode, sectionTheme, headerStyle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);