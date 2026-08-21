import { ArrowUpRight } from 'lucide-react';

/**
 * A starter prompt for the empty state.
 *
 * The four prompts come from the spec and are phrased the way someone actually
 * shops - a category and a budget - because the point of the empty state is to show
 * what this agent can do, not to be decorative.
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
      className="rounded-control border-line bg-surface hover:border-accent-200 hover:bg-accent-50/40 group flex w-full items-center justify-between gap-3 border px-3.5 py-2.5 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-ink text-[13px]">{prompt}</span>
      <ArrowUpRight
        className="text-faint group-hover:text-accent size-3.5 shrink-0 transition-colors"
        aria-hidden
      />
    </button>
  );
}
