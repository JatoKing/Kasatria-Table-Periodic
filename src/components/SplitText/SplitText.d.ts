import type { gsap } from 'gsap';
import type { CSSProperties, JSX } from 'react';

/**
 * Types for SplitText.jsx, which comes from the React Bits registry as plain JavaScript.
 * TypeScript infers every prop without a default as required, so these declarations take its place.
 */
export interface SplitTextProps {
  text: string;
  className?: string;
  /** Milliseconds between pieces. */
  delay?: number;
  /** Seconds per piece. */
  duration?: number;
  ease?: string | ((progress: number) => number);
  splitType?: 'chars' | 'words' | 'lines' | 'words, chars' | (string & {});
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: CSSProperties['textAlign'];
  tag?: keyof JSX.IntrinsicElements;
  staggerFrom?: 'start' | 'center' | 'end' | 'edges' | 'random' | number;
  mask?: boolean;
  effect?: 'rise' | 'fade' | 'blur' | 'flip' | 'pop' | 'skew' | 'wave';
  trigger?: 'view' | 'load' | 'hover' | 'click';
  loop?: boolean;
  loopDelay?: number;
  hoverEffect?: 'none' | 'lift' | 'wave';
  color?: string;
  accentColor?: string;
  onLetterAnimationComplete?: () => void;
}

declare function SplitText(props: SplitTextProps): JSX.Element;

export default SplitText;
