import { ArrowUpRight } from 'lucide-react';

/**
 * A starter prompt for the empty state.
 *
 * The four prompts come from the spec and are phrased the way someone actually
 * shops - a category and a budget - because the point of the empty state is to show
 * what this agent can do, not to be decorative.
 *
 * A colour block, not an outlined row: hover intensifies the block and lifts it by 1%,
 * which is the whole feedback vocabulary in this system. Nothing here casts a shadow.
 */
export function SuggestedPrompt({
  prompt,
  onSelect,
  disabled = false,
}: {
  prompt: string;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(prompt)}
      disabled={disabled}
      className="bg-surface-sunken hover:bg-brand-blue-subtle motion-micro group flex min-h-14 w-full items-center justify-between gap-3 rounded-card px-4 py-3 text-left transition-[background-color,transform] disabled:cursor-not-allowed disabled:opacity-50 motion-safe:hover:scale-[1.01] motion-safe:disabled:hover:scale-100"
    >
      <span className="text-ink text-[13px] font-semibold">{prompt}</span>
      <ArrowUpRight
        className="text-faint group-hover:text-brand-blue motion-fast size-4 shrink-0 transition-colors"
        strokeWidth={2.5}
        aria-hidden
      />
    </button>
  );
}
