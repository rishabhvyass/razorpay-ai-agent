import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { MockBadge } from '@/components/ui';

/**
 * The geometry both message kinds share: avatar, column, timestamp footer.
 *
 * Extracted so AIMessage and UserMessage can differ in what they say without
 * drifting in how they sit. A user turn mirrors the layout (avatar on the right,
 * content right-aligned); everything else about the frame is identical, and
 * duplicating it in two files is how two bubbles end up with different gaps.
 */
export function MessageShell({
  align,
  label,
  avatar,
  mock,
  createdAt,
  children,
}: {
  align: 'start' | 'end';
  /** Read out in place of the visual role cue, which is position and colour only. */
  label: string;
  avatar: ReactNode;
  mock?: boolean;
  createdAt: string;
  children: ReactNode;
}) {
  const mirrored = align === 'end';

  return (
    <article
      className={cn('animate-fade-up flex gap-2.5', mirrored && 'flex-row-reverse')}
      aria-label={label}
    >
      {avatar}

      <div
        className={cn(
          'flex min-w-0 max-w-full flex-1 flex-col gap-2.5',
          mirrored ? 'items-end' : 'items-start',
        )}
      >
        {children}

        <div className={cn('flex items-center gap-2 px-1', mirrored && 'flex-row-reverse')}>
          <time className="text-faint nums text-[11px]" dateTime={createdAt}>
            {formatTime(createdAt)}
          </time>
          {/* The marker travels with the turn - a simulated reply cannot render
              without it. */}
          {mock ? <MockBadge /> : null}
        </div>
      </div>
    </article>
  );
}

/** The message body bubble. Plain text only; model output is never markup. */
export function MessageBubble({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card max-w-[min(38rem,100%)] px-3.5 py-2.5 text-[13px] leading-relaxed',
        className,
      )}
    >
      <p className="break-words whitespace-pre-wrap">{children}</p>
    </div>
  );
}
