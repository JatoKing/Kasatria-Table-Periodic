import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling with Lenis while the calling component is mounted. GSAP's ticker drives Lenis,
 * so ScrollTrigger and Lenis update on the same frame. Skipped with reduced motion.
 */
export function useSmoothScroll(): void {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis();
    const driveLenis = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(driveLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(driveLenis);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
}
