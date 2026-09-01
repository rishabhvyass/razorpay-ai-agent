import { useEffect, useRef, useState } from 'react';

/**
 * How many times a value has actually changed since this component mounted.
 *
 * The reason this exists rather than a plain comparison: a status tracker should
 * animate a step the moment it *becomes* complete, and should be perfectly still on a
 * page that loads with the step already complete (spec section 31). Both of those are
 * "did this change", and neither is "what is this now".
 *
 * Returning a count rather than a boolean gives a stable identity for the change. A
 * boolean derived during render flips back to false on the next unrelated re-render -
 * of which a polled order row has plenty - and an animation class removed mid-flight
 * snaps the element to its end state. A count only moves when the value does, so it can
 * key an element and hold an animation class for as long as the animation runs.
 *
 * 0 means "this is how it arrived". Anything higher means the backend said something
 * new while the reader was watching.
 */
export function useChangeCount<T>(value: T): number {
  const previous = useRef(value);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setCount((current) => current + 1);
  }, [value]);

  return count;
}
