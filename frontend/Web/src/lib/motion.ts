import type { CSSProperties } from 'react';

/**
 * The two things JavaScript needs to know about the motion system.
 *
 * Everything else lives in `index.css`: four durations, three curves, one stagger
 * step. Nothing here restates a millisecond value - `duration()` reads the token off
 * the document, so a component that has to hold an element on screen for the length
 * of an exit animation stays in step with the CSS that plays it. That is the whole
 * reason this file exists rather than a `const EXIT_MS = 190` next to the one
 * component that needed it.
 */
export type MotionToken = 'fast' | 'micro' | 'normal' | 'large';

/**
 * Position in a staggered entrance.
 *
 * Consumed by the entrance classes as `--stagger`, which multiply it by the shared
 * step and cap the total. A list only has to say where each item sits in the
 * sequence; how far apart the items are is not its decision.
 */
export function stagger(index: number): CSSProperties {
  return { '--stagger': index } as CSSProperties;
}

/** True when the reader has asked the platform for less movement. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A duration token in milliseconds, as the browser has it.
 *
 * Returns 0 under reduced motion, because the global override in `index.css` has
 * already collapsed the animation to nothing and anything waiting on it should not
 * wait. Falls back to a sane number only if the token cannot be read at all - server
 * rendering, or a test environment with no stylesheet.
 */
const FALLBACK: Record<MotionToken, number> = {
  fast: 140,
  micro: 190,
  normal: 260,
  large: 320,
};

export function duration(token: MotionToken): number {
  if (prefersReducedMotion()) return 0;
  if (typeof window === 'undefined') return FALLBACK[token];

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--duration-${token}`)
    .trim();

  // `260ms` or `0.26s`, either of which is a legal token value.
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return FALLBACK[token];
  return raw.endsWith('ms') ? value : value * 1000;
}
