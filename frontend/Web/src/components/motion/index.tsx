import { createElement } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { stagger } from '@/lib/motion';

/**
 * MOTION PRIMITIVES.
 *
 * Four entrances and one expansion, so that "how things arrive" is a decision made
 * once. Each entrance is a single class from `index.css` - the component exists to
 * carry the stagger index and to keep the class name out of thirty call sites, not to
 * reimplement the animation in JavaScript.
 *
 * Where an element already has a class list of its own, use the class directly
 * (`animate-fade-up`, `animate-enter-x`, `animate-scale-in`) rather than wrapping it
 * in one of these - a wrapper div that exists only to animate is a wrapper div that
 * breaks a grid or a flex row.
 *
 * None of them take a duration. That is the point.
 */
type Element = 'div' | 'span' | 'li' | 'section' | 'article' | 'header';

interface EntranceProps {
  children: ReactNode;
  className?: string;
  /**
   * Position in a staggered sequence, from a list index. The step between items and
   * the ceiling on the total are set in CSS, so a list says where an item sits and
   * nothing else.
   */
  index?: number;
  /** For when a div would be wrong: a row inside a list, a section, a span inline. */
  as?: Element;
}

function Entrance({ animation, as = 'div', className, index, children }: EntranceProps & { animation: string }) {
  return createElement(
    as,
    {
      className: cn(animation, className),
      ...(index === undefined ? {} : { style: stagger(index) }),
    },
    children,
  );
}

/** Opacity only. For things that must not move: numbers, icons swapping, badges. */
export function Fade(props: EntranceProps) {
  return <Entrance animation="animate-fade-in" {...props} />;
}

/** Opacity plus 8px up. The default entrance for content: cards, rows, turns. */
export function SlideUp(props: EntranceProps) {
  return <Entrance animation="animate-fade-up" {...props} />;
}

/** Opacity plus 8px in from the right. For rows hanging off a vertical rail. */
export function SlideRight(props: EntranceProps) {
  return <Entrance animation="animate-enter-x" {...props} />;
}

/** Opacity, 6px up, and 0.98 → 1. For surfaces that appear over other content. */
export function ScaleIn(props: EntranceProps) {
  return <Entrance animation="animate-scale-in" {...props} />;
}

/**
 * Height and opacity, for a region that expands in place.
 *
 * `grid-template-rows: 0fr → 1fr` animates to the content's own height without
 * measuring anything, so there is no ResizeObserver, no `maxHeight: 9999px` guess,
 * and no `display: none` snap at either end. The inner element does the clipping;
 * the outer one owns the transition.
 *
 * Closed content stays mounted and is marked `inert`, which takes it out of the tab
 * order and out of the accessibility tree in one attribute - a collapsed panel whose
 * buttons are still focusable is a keyboard trap in a region nobody can see.
 */
export function Collapse({
  open,
  children,
  className,
  id,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      {...(id ? { id } : {})}
      inert={!open}
      className={cn(
        'motion-normal grid transition-[grid-template-rows,opacity]',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
