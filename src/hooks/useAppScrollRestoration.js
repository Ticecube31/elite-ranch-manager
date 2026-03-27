import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Store scroll positions per route
const scrollPositions = new Map();

/**
 * Manages scroll position restoration for mobile app tabs
 * Preserves position when switching between tabs and returning
 * Also handles browser back button correctly
 */
export function useAppScrollRestoration() {
  const { pathname } = useLocation();

  // Save scroll position when leaving a route
  useEffect(() => {
    return () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop;
      scrollPositions.set(pathname, scrollPos);
    };
  }, [pathname]);

  // Restore scroll position when arriving at a route
  useEffect(() => {
    // Defer to allow DOM to fully render
    const restoreTimer = requestAnimationFrame(() => {
      const savedPos = scrollPositions.get(pathname) ?? 0;
      window.scrollTo(0, savedPos);
    });

    return () => cancelAnimationFrame(restoreTimer);
  }, [pathname]);

  return { getCurrentPosition: () => window.scrollY };
}