import { MercoraGlyph } from '@/components/layout/MercoraMark';

/**
 * "Mercora is thinking." Spec section 04.
 *
 * Present because an agent turn involves a model call and possibly several tool calls,
 * so the wait is long enough that silence reads as a hang. Two lines rather than one:
 * the first names who is working, the second names what it is doing right now, and the
 * second comes from `session.phase`, which is set immediately before each await. So the
 * sub-line is a report on a request that is genuinely in flight, not a scripted
 * sequence of reassuring verbs.
 *
 * The three dots animate on a staggered delay rather than pulsing together - a group
 * that pulses in unison looks like a loading placeholder, not like something working.
 */
export function ThinkingIndicator({ label }: { label?: string }) {
  // 'Thinking' is what the generic phase is called, and "Mercora is thinking /
  // Thinking" is not a second fact.
  const detail = label !== undefined && label !== 'Thinking' ? label : null;

  return (
    <div className="animate-fade-up flex items-start gap-2.5" role="status" aria-live="polite">
      <span className="bg-brand-blue mt-0.5 grid size-7 shrink-0 place-items-center rounded-control p-1 text-white">
        <MercoraGlyph />
      </span>

      <div className="rounded-card bg-surface-sunken px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-ink text-[13px] font-bold tracking-[-0.01em]">
            Mercora is thinking
          </span>
          <span className="flex items-center gap-1" aria-hidden>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="bg-brand-blue animate-thinking size-1.5 rounded-full"
                style={{ animationDelay: `${index * 160}ms` }}
              />
            ))}
          </span>
        </div>

        {detail ? <p className="text-muted mt-1 text-[12px] leading-relaxed">{detail}</p> : null}
      </div>
    </div>
  );
}
