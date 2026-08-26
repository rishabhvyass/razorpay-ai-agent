import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, Check, CreditCard, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

const MAX_LENGTH = 500;

/**
 * The composer.
 *
 * Behaviours, all from spec section 11:
 *   - Enter sends; Shift+Enter inserts a newline.
 *   - Disabled while a turn is in flight, so a user cannot queue three messages
 *     into an agent that processes one at a time.
 *   - The textarea grows with its content up to a cap, then scrolls. A fixed
 *     single-line input truncates the kind of descriptive request this agent is
 *     built for.
 */
export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Ask your AI shopping assistant...',
  autoFocus = false,
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState('');
  const [copiedCard, setCopiedCard] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autosize. Reset to `auto` first, or the height only ever grows.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 140)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed === '' || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const copyTestCard = () => {
    void navigator.clipboard.writeText('4000000000000002');
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2000);
  };

  const canSend = value.trim() !== '' && !disabled;
  const nearLimit = value.length > MAX_LENGTH - 60;

  return (
    <div className="border-line bg-surface/90 border-t px-4 py-3 backdrop-blur-md transition-colors duration-200 md:px-6">
      {/* Test mode quick badge */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => onSend('Show me all categories')}
            disabled={disabled}
            className="border-line bg-surface-subtle text-muted hover:border-accent-200 hover:bg-accent-50 hover:text-accent inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all"
          >
            <Sparkles className="size-3 text-accent" />
            <span>Categories</span>
          </button>
          <button
            type="button"
            onClick={() => onSend('Find running shoes under 3500')}
            disabled={disabled}
            className="border-line bg-surface-subtle text-muted hover:border-accent-200 hover:bg-accent-50 hover:text-accent inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all"
          >
            <span>🏃 Shoes &lt; ₹3.5k</span>
          </button>
          <button
            type="button"
            onClick={() => onSend('Find a black hoodie')}
            disabled={disabled}
            className="border-line bg-surface-subtle text-muted hover:border-accent-200 hover:bg-accent-50 hover:text-accent inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all"
          >
            <span>🧥 Black Hoodies</span>
          </button>
        </div>

        <button
          type="button"
          onClick={copyTestCard}
          title="Copy Razorpay Domestic Test Card Number"
          className="border-line bg-surface-sunken hover:bg-surface text-muted hover:text-ink inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-mono transition-colors"
        >
          {copiedCard ? (
            <>
              <Check className="size-3 text-success" />
              <span className="text-success font-sans">Copied 4000...0002</span>
            </>
          ) : (
            <>
              <CreditCard className="size-3 text-razorpay" />
              <span>Test Card: 4000 0000 0000 0002</span>
            </>
          )}
        </button>
      </div>

      <div
        className={cn(
          'rounded-card border-line-strong bg-surface flex items-end gap-2 border px-3 py-2 transition-all shadow-subtle',
          'focus-within:border-accent focus-within:ring-accent/20 focus-within:ring-2',
        )}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message the shopping agent
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          rows={1}
          value={value}
          maxLength={MAX_LENGTH}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={disabled ? 'Waiting for the agent…' : placeholder}
          className="text-ink placeholder:text-faint scrollbar-slim min-h-6 flex-1 resize-none bg-transparent py-1 text-sm leading-6 outline-none focus-visible:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-lg transition-all duration-150',
            canSend
              ? 'bg-accent hover:bg-accent-700 text-white shadow-sm hover:scale-105 active:scale-95'
              : 'bg-surface-sunken text-faint cursor-not-allowed',
          )}
        >
          <ArrowUp className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 px-1">
        <p className="text-faint text-[11px]">
          <kbd className="border-line bg-surface-sunken rounded border px-1 font-sans font-medium">Enter</kbd> to send ·{' '}
          <kbd className="border-line bg-surface-sunken rounded border px-1 font-sans font-medium">Shift+Enter</kbd> for a new line
        </p>
        {nearLimit ? (
          <span
            className={cn(
              'nums text-[11px]',
              value.length >= MAX_LENGTH ? 'text-danger font-semibold' : 'text-warning',
            )}
            aria-live="polite"
          >
            {MAX_LENGTH - value.length} left
          </span>
        ) : null}
      </div>
    </div>
  );
}
