import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const scrollPositions = {};

/**
 * Preserves scroll position per tab/route
 * Restores position when returning to a route
 */
export function useTabScrollPosition(containerId = 'main-scroll-container') {
  const location = useLocation();
  const scrollRef = useRef(null);

  // Save scroll position before leaving
  useEffect(() => {
    return () => {
      const container = document.getElementById(containerId) || window;
      const scrollPos = container.scrollY ?? (container.scrollTop || window.scrollY);
      scrollPositions[location.pathname] = scrollPos;
    };
  }, [location.pathname, containerId]);

  // Restore scroll position when arriving
  useEffect(() => {
    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      const container = document.getElementById(containerId);
      const savedPos = scrollPositions[location.pathname] ?? 0;
      
      if (container) {
        container.scrollTop = savedPos;
      } else {
        window.scrollTo(0, savedPos);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [location.pathname, containerId]);

  return scrollRef;
}