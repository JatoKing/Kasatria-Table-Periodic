'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import styles from './CustomCursor.module.css';

const RING_SIZE = 34;
const GRAB_SIZE = 68;
const FRAME_PADDING = 5;
const INTERACTIVE = 'button:not(:disabled), a[href]';
const DRAGGABLE = '[data-cursor="drag"]';

/**
 * Replaces the mouse pointer on the login page: a dot that tracks the pointer exactly and a ring
 * that trails it. Over a button the ring outlines the button; over something draggable it grows
 * and says so. Only for a mouse or pen; touch screens keep their default behaviour.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const trail = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.35;
    // quickTo with a zero duration never moves the element, so reduced motion sets positions directly.
    const follow = (element: HTMLElement, property: 'x' | 'y', duration: number) =>
      duration > 0
        ? gsap.quickTo(element, property, { duration, ease: 'power3.out' })
        : (gsap.quickSetter(element, property, 'px') as (value: number) => void);
    const moveDot = { x: follow(dot, 'x', 0), y: follow(dot, 'y', 0) };
    const moveRing = { x: follow(ring, 'x', trail), y: follow(ring, 'y', trail) };
    const reshape = (vars: gsap.TweenVars) =>
      gsap.to(ring, { ...vars, duration: trail, ease: 'power3.out', overwrite: 'auto' });

    let framed: Element | null = null;
    let pointer = { x: 0, y: 0 };

    const root = document.documentElement;
    root.classList.add(styles.hideNativeCursor);

    const show = (visible: boolean) => {
      gsap.to([dot, ring], { autoAlpha: visible ? 1 : 0, duration: 0.2, overwrite: 'auto' });
    };

    const update = (target: Element | null) => {
      const interactive = target?.closest(INTERACTIVE) ?? null;
      const draggable = interactive ? null : (target?.closest(DRAGGABLE) ?? null);
      ring.dataset.mode = interactive ? 'frame' : draggable ? 'drag' : 'follow';

      if (interactive) {
        if (interactive === framed) return;
        framed = interactive;
        const bounds = interactive.getBoundingClientRect();
        const radius = parseFloat(getComputedStyle(interactive).borderTopLeftRadius) || 0;
        moveRing.x(bounds.left + bounds.width / 2);
        moveRing.y(bounds.top + bounds.height / 2);
        reshape({
          width: bounds.width + FRAME_PADDING * 2,
          height: bounds.height + FRAME_PADDING * 2,
          borderRadius: radius + FRAME_PADDING,
        });
        return;
      }

      framed = null;
      const size = draggable ? GRAB_SIZE : RING_SIZE;
      reshape({ width: size, height: size, borderRadius: size / 2 });
    };

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      moveDot.x(pointer.x);
      moveDot.y(pointer.y);
      // A framed button can still be moving (it sits on the swinging pass), so the frame re-centres on it.
      const bounds = framed?.getBoundingClientRect();
      moveRing.x(bounds ? bounds.left + bounds.width / 2 : pointer.x);
      moveRing.y(bounds ? bounds.top + bounds.height / 2 : pointer.y);
      show(true);
    };

    const handleOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      update(event.target instanceof Element ? event.target : null);
      if (!framed) {
        moveRing.x(pointer.x);
        moveRing.y(pointer.y);
      }
    };

    const handleOut = (event: PointerEvent) => {
      if (!event.relatedTarget) show(false);
    };

    const handleDown = () => gsap.to(ring, { scale: 0.88, duration: 0.12 });
    const handleUp = () => gsap.to(ring, { scale: 1, duration: 0.3, ease: 'back.out(3)' });

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerover', handleOver);
    document.addEventListener('pointerout', handleOut);
    document.addEventListener('pointerdown', handleDown);
    document.addEventListener('pointerup', handleUp);

    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerover', handleOver);
      document.removeEventListener('pointerout', handleOut);
      document.removeEventListener('pointerdown', handleDown);
      document.removeEventListener('pointerup', handleUp);
      root.classList.remove(styles.hideNativeCursor);
      gsap.killTweensOf([dot, ring]);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className={styles.ring} data-mode="follow" aria-hidden="true">
        <span className={styles.label}>Drag</span>
      </div>
      <div ref={dotRef} className={styles.dot} aria-hidden="true" />
    </>
  );
}
