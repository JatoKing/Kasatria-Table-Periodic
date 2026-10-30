'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Pendulum } from '@/lib/motion/pendulum';
import { GoogleSignInButton } from './GoogleSignInButton';
import styles from './VisitorPass.module.css';

/** The parts of the pass that the "what signing in does" steps point at. */
export type PassField = 'holder' | 'access' | 'validity';

interface VisitorPassProps {
  highlight: PassField | null;
  onSignIn: () => void;
  signInDisabled: boolean;
  signInLabel: string;
  message: string | null;
}

const RADIANS_TO_DEGREES = 180 / Math.PI;
/** How far the pass keeps swinging either side on its own, about 6°. */
const SWING_AMPLITUDE = 0.1;
const FREE = { stiffness: 9, damping: 0.9 };
/**
 * While the pointer or keyboard focus is on the pass, it is held like a hand steadying it: stiffer,
 * and critically damped (damping = 2√stiffness), so it stops in well under a second without bouncing.
 */
const HELD = { stiffness: 36, damping: 12 };
/**
 * Entrance: the pass is let go from up on the left (100°, mostly above the screen) and swings across
 * to the right and back. Extra damping for the first seconds keeps the first swing on screen and
 * settles it into the small idle swing.
 */
const ENTRANCE_ANGLE = (100 * Math.PI) / 180;
const ENTRANCE_DAMPING = 1.6;
const ENTRANCE_SECONDS = 3;
/** Wide enough for the entrance and for dragging the pass up to the side. */
const MAX_ANGLE = (105 * Math.PI) / 180;
/** Turn of the card around its vertical axis per unit of swing speed, like a real badge twisting. */
const TWIST = 10;
const MAX_TWIST = 22;
/** Swing added per pixel scrolled, and the most a single scroll event can add. */
const SCROLL_PUSH = 0.0009;
const MAX_SCROLL_PUSH = 0.15;

const STRAP_TEXT = Array.from({ length: 12 }, () => 'Kasatria').join('   ');

/**
 * A visitor pass on a lanyard. On load it swings in from the left, across to the right, and settles
 * into a small swing around the centre that keeps going until the pointer (or keyboard focus) rests
 * on it, then starts again when it leaves. It can be dragged by the card and sways a little as the
 * page scrolls. The sign-in button sits on the pass.
 * With reduced motion it simply hangs still.
 */
export function VisitorPass({ highlight, onSignIn, signInDisabled, signInLabel, message }: VisitorPassProps) {
  const rigRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rig = rigRef.current;
    const card = cardRef.current;
    if (!rig || !card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const pendulum = new Pendulum({ maxAngle: MAX_ANGLE, amplitude: SWING_AMPLITUDE });
    pendulum.angle = ENTRANCE_ANGLE;
    const setRotation = gsap.quickSetter(rig, 'rotation', 'deg') as (value: number) => void;
    const setTwist = gsap.quickSetter(card, 'rotationY', 'deg') as (value: number) => void;
    gsap.set(card, { transformPerspective: 900 });
    // CSS holds the same starting pose until this runs (see .rig); GSAP's transform takes over from it.
    setRotation(ENTRANCE_ANGLE * RADIANS_TO_DEGREES);
    rig.style.rotate = 'none';

    let drag: { pointerId: number; offset: number; angle: number } | null = null;
    let entering = true;
    let hovered = false;
    let focused = false;
    let lastScrollY = window.scrollY;

    const updateSwing = () => {
      const held = hovered || focused;
      Object.assign(pendulum, held ? HELD : { ...FREE, damping: entering ? ENTRANCE_DAMPING : FREE.damping });
      pendulum.amplitude = held ? 0 : SWING_AMPLITUDE;
    };
    updateSwing();

    /** Angle from the top of the strap to the pointer. Offsets ignore transforms, so this is the resting pivot. */
    const angleTo = (event: PointerEvent) => {
      const parent = (rig.offsetParent ?? document.body).getBoundingClientRect();
      const pivotX = parent.left + rig.offsetLeft + rig.offsetWidth / 2;
      const pivotY = parent.top + rig.offsetTop;
      return -Math.atan2(event.clientX - pivotX, event.clientY - pivotY);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) return;
      card.setPointerCapture(event.pointerId);
      drag = { pointerId: event.pointerId, offset: angleTo(event) - pendulum.angle, angle: pendulum.angle };
      card.dataset.dragging = 'true';
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (drag?.pointerId === event.pointerId) drag.angle = angleTo(event) - drag.offset;
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (drag?.pointerId !== event.pointerId) return;
      drag = null;
      delete card.dataset.dragging;
    };
    const handlePointerEnter = () => {
      hovered = true;
      updateSwing();
    };
    const handlePointerLeave = () => {
      hovered = false;
      updateSwing();
    };
    const handleFocusIn = () => {
      focused = true;
      updateSwing();
    };
    const handleFocusOut = () => {
      focused = false;
      updateSwing();
    };
    const handleScroll = () => {
      const delta = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      pendulum.push(gsap.utils.clamp(-MAX_SCROLL_PUSH, MAX_SCROLL_PUSH, delta * SCROLL_PUSH));
    };

    const tick = (_time: number, deltaTime: number) => {
      const seconds = Math.min(deltaTime / 1000, 1 / 30);
      if (drag) pendulum.hold(drag.angle, seconds);
      else pendulum.step(seconds);
      setRotation(pendulum.angle * RADIANS_TO_DEGREES);
      setTwist(gsap.utils.clamp(-MAX_TWIST, MAX_TWIST, pendulum.velocity * TWIST));
    };

    card.addEventListener('pointerdown', handlePointerDown);
    card.addEventListener('pointermove', handlePointerMove);
    card.addEventListener('pointerup', handlePointerUp);
    card.addEventListener('pointercancel', handlePointerUp);
    card.addEventListener('pointerenter', handlePointerEnter);
    card.addEventListener('pointerleave', handlePointerLeave);
    card.addEventListener('focusin', handleFocusIn);
    card.addEventListener('focusout', handleFocusOut);
    window.addEventListener('scroll', handleScroll, { passive: true });
    gsap.ticker.add(tick);

    // The pass is already let go from ENTRANCE_ANGLE; once the big swings are over, normal damping takes over.
    const settle = gsap.delayedCall(ENTRANCE_SECONDS, () => {
      entering = false;
      updateSwing();
    });

    return () => {
      card.removeEventListener('pointerdown', handlePointerDown);
      card.removeEventListener('pointermove', handlePointerMove);
      card.removeEventListener('pointerup', handlePointerUp);
      card.removeEventListener('pointercancel', handlePointerUp);
      card.removeEventListener('pointerenter', handlePointerEnter);
      card.removeEventListener('pointerleave', handlePointerLeave);
      card.removeEventListener('focusin', handleFocusIn);
      card.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('scroll', handleScroll);
      gsap.ticker.remove(tick);
      settle.kill();
      gsap.set([rig, card], { clearProps: 'transform' });
      rig.style.rotate = '';
    };
  }, []);

  return (
    <div className={styles.stage}>
      <div ref={rigRef} className={styles.rig}>
        <div className={styles.strap} aria-hidden="true">
          <span>{STRAP_TEXT}</span>
        </div>
        <div className={styles.clasp} aria-hidden="true" />

        <div ref={cardRef} className={styles.card} role="group" aria-label="Visitor pass" data-cursor="drag">
          <div className={styles.slot} aria-hidden="true" />

          <div className={styles.issuer}>
            <span className={styles.wordmark}>Kasatria</span>
            <span className={styles.product}>People Table</span>
          </div>

          <p className={styles.band}>Visitor</p>

          <div className={styles.details}>
            <div className={styles.photo} data-active={highlight === 'holder'} aria-hidden="true">
              <svg viewBox="0 0 84 104">
                <circle cx="42" cy="38" r="17" />
                <path d="M10 104c0-21 14-35 32-35s32 14 32 35z" />
              </svg>
            </div>
            <dl className={styles.fields}>
              <div className={styles.field} data-active={highlight === 'holder'}>
                <dt>Name</dt>
                <dd className={styles.blank}>Your Google name</dd>
              </div>
              <div className={styles.field} data-active={highlight === 'access'}>
                <dt>Access</dt>
                <dd>View only</dd>
              </div>
              <div className={styles.field} data-active={highlight === 'validity'}>
                <dt>Valid</dt>
                <dd>This tab only</dd>
              </div>
            </dl>
          </div>

          <div className={styles.signIn}>
            <GoogleSignInButton onClick={onSignIn} disabled={signInDisabled} label={signInLabel} />
          </div>

          {message && (
            <p className={styles.message} role="alert">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
