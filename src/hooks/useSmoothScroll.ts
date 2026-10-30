import { useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/** Space left above an element scrolled to, so its heading doesn't sit against the top edge. */
const SCROLL_OFFSET = 48;

/**
 * Smooth scrolling with Lenis while the calling component is mounted. GSAP's ticker drives Lenis,
 * so ScrollTrigger and Lenis update on the same frame. Skipped with reduced motion.
 *
 * Returns a function that scrolls to an element: through Lenis when it runs, so the two never
 * fight over the scroll position, and instantly otherwise.
 */
export function useSmoothScroll(): (target: HTMLElement) => void {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis();
    const driveLenis = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(driveLenis);
    gsap.ticker.lagSmoothing(0);
    lenisRef.current = lenis;

    return () => {
      lenisRef.current = null;
      gsap.ticker.remove(driveLenis);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return useCallback((target: HTMLElement) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: -SCROLL_OFFSET, duration: 1.4 });
      return;
    }
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET });
  }, []);
}
