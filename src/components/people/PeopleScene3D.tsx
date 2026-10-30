'use client';

import { useEffect, useRef } from 'react';
import type { LayoutName } from '@/lib/layouts/layouts';
import type { Person } from '@/lib/people/types';
import type { PeopleScene } from '@/lib/scene/people-scene';
import styles from './PeopleScene3D.module.css';

interface PeopleScene3DProps {
  people: readonly Person[];
  layout: LayoutName;
}

function getTransitionDuration(): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2000;
}

/**
 * React host for the imperative three.js scene. three.js is loaded with a dynamic import,
 * so it stays out of the login page bundle and never runs on the server.
 */
export function PeopleScene3D({ people, layout }: PeopleScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PeopleScene | null>(null);
  const layoutRef = useRef(layout);

  useEffect(() => {
    layoutRef.current = layout;
    sceneRef.current?.transformTo(layout, getTransitionDuration());
  }, [layout]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let scene: PeopleScene | null = null;

    import('@/lib/scene/people-scene').then(({ PeopleScene }) => {
      if (cancelled) return;
      scene = new PeopleScene(container, people);
      sceneRef.current = scene;
      scene.transformTo(layoutRef.current, getTransitionDuration());
    });

    return () => {
      cancelled = true;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [people]);

  return <div ref={containerRef} className={styles.scene} />;
}
