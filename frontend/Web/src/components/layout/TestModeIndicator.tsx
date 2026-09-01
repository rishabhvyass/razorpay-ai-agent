import { cn } from '@/lib/cn';

/**
 * The permanent test-mode statement.
 *
 * Amber, flat, and quiet: it has to be legible at a glance without competing with the
 * primary action on the screen, because it is true on every screen. Test mode must
 * never be able to be mistaken for production, so this never renders conditionally on
 * a dismissal flag - there is no dismissal.
 *
 * The claim it makes is narrow and accurate: payments go through Razorpay Test Mode.
 * It says nothing about whether the agent or the database is mocked - `MockBadge`
 * carries that, and it travels with the data instead of the chrome.
 */
export function TestModeIndicator({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-warning-bg text-razorpay inline-flex items-center gap-1.5 rounded-control font-bold uppercase',
        compact
          ? 'px-2 py-1 text-[10px] tracking-[0.08em]'
          : 'w-full px-2.5 py-2 text-[10px] tracking-[0.1em]',
        className,
      )}
    >
      <span className="bg-razorpay size-1.5 shrink-0 rounded-full" aria-hidden />
      {compact ? (
        <>
          <span className="hidden sm:inline">Razorpay Test Mode</span>
          <span className="sm:hidden">Test Mode</span>
        </>
      ) : (
        'Razorpay Test Mode'
      )}
    </span>
  );
}
