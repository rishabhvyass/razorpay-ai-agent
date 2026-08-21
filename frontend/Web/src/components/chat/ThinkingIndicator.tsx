import { Sparkles } from 'lucide-react';

/**
 * "Agent is thinking."
 *
 * Present because an agent turn involves a model call and possibly several tool
 * calls, so the wait is long enough that silence reads as a hang. The three dots
 * animate on a staggered delay rather than pulsing together - a group that pulses
 * in unison looks like a loading placeholder, not like something working.
 */
export function ThinkingIndicator({ label = 'Thinking' }: { label?: string }) {
  return (
    <div className="animate-fade-up flex items-start gap-2.5" role="status" aria-live="polite">
      <span className="bg-accent-50 border-accent-100 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border">
        <Sparkles className="text-accent size-3.5" aria-hidden />
      </span>
      <div className="rounded-card border-line bg-surface flex items-center gap-2 border px-3.5 py-2.5">
        <span className="text-muted text-[13px]">{label}</span>
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="bg-accent animate-thinking size-1.5 rounded-full"
              style={{ animationDelay: `${index * 160}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
