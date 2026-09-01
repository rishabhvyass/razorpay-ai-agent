import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

/**
 * Id of the hint paragraph a `Field` renders, or undefined when it has no hint.
 *
 * The hint and the control it describes are rendered by two different components, so
 * the id has to travel between them. Context keeps `Field` its only owner: no caller
 * has to remember to pass one and no second id can be invented, which is precisely
 * how a description and the control it belongs to drift apart.
 */
const FieldHintIdContext = createContext<string | undefined>(undefined);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leading, trailing, invalid = false, className, 'aria-describedby': describedBy, ...rest },
  ref,
) {
  const hintId = useContext(FieldHintIdContext);
  // The field's hint is named first: when the control is invalid that is where the
  // reason lives, and `aria-invalid` on its own only ever says "invalid entry".
  // Anything the caller pointed at follows, rather than being clobbered. An empty
  // join means there is nothing to describe, and aria-describedby="" is a dangling
  // reference in its own right, so the attribute disappears instead.
  const describedByIds = [hintId, describedBy].filter(Boolean).join(' ');

  return (
    <div
      className={cn(
        // A bordered box, not an underline: the field's edges are part of the
        // geometric composition, and a box is the shape a mobile keyboard user can
        // actually see the extent of.
        'border-line bg-surface flex h-11 items-center gap-2 rounded-control border px-3',
        // Spec section 48: the border colour is the whole focus treatment, on the
        // fast token because it is feedback on a keystroke. No glow, no ring that
        // grows, and no shadow - the token layer resolves those to nothing anyway.
        'motion-fast transition-[border-color,background-color]',
        'focus-within:border-brand-blue',
        invalid && 'border-danger',
        className,
      )}
    >
      {leading ? <span className="text-faint shrink-0">{leading}</span> : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        aria-describedby={describedByIds || undefined}
        // The focus treatment lives on the wrapper, so the inner element drops its
        // own — otherwise focus draws two rings a few pixels apart.
        className="text-ink placeholder:text-faint min-w-0 flex-1 bg-transparent text-[14px] outline-none focus-visible:outline-none"
        {...rest}
      />
      {trailing ? <span className="text-faint shrink-0">{trailing}</span> : null}
    </div>
  );
});

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  const hintId = useId();
  const hintRef = useRef<HTMLParagraphElement>(null);
  const hasHint = Boolean(hint);

  // The hint doubles as a polite live region, so that a hint changing under a focused
  // control - the validation explanation replacing the neutral one - is spoken rather
  // than swapped in silence.
  //
  // `aria-live` is set from an effect instead of being rendered as a prop so that it
  // lands a beat after the text: several screen readers announce a live region that
  // arrives with its content already in place, and a field reciting its hint on mount
  // is pure noise. React never owns this attribute, so it survives later renders. The
  // trade is that a hint's first appearance stays silent and only subsequent changes
  // are announced - acceptable, because aria-describedby speaks the current text as
  // soon as focus reaches the control.
  useEffect(() => {
    // Keyed on `hasHint` rather than firing once, because a hint that appears later
    // gets a brand-new paragraph element that needs the attribute too.
    if (hasHint) {
      hintRef.current?.setAttribute('aria-live', 'polite');
    }
  }, [hasHint]);

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-ink block text-[13px] font-semibold">
        {label}
      </label>
      {/* The id is offered only while there is a hint carrying it - a describedby
          pointing at an element that does not exist is worse than none at all. */}
      <FieldHintIdContext.Provider value={hint ? hintId : undefined}>
        {children}
      </FieldHintIdContext.Provider>
      {hint ? (
        <p
          ref={hintRef}
          id={hintId}
          // The whole hint is replaced at once, so it is read whole: the words two
          // unrelated sentences happen to share are not a sentence.
          aria-atomic="true"
          className="text-muted text-xs leading-relaxed"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
