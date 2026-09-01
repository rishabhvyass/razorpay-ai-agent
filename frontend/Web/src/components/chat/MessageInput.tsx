import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, ChevronDown } from 'lucide-react';
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
  placeholder = 'Work with Mercora',
  autoFocus = false,
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState('');
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

  const canSend = value.trim() !== '' && !disabled;
  const nearLimit = value.length > MAX_LENGTH - 60;

  return (
    <div className="bg-canvas px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div
          className={cn(
            'border-line bg-surface motion-fast min-h-[142px] rounded-[22px] border-2 px-4 pt-4 pb-3 transition-colors',
            'focus-within:border-brand-blue',
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
            className="text-ink placeholder:text-faint scrollbar-slim min-h-[68px] w-full resize-none bg-transparent text-[17px] leading-6 outline-none focus-visible:outline-none disabled:opacity-60 sm:text-[18px]"
          />
          <div className="flex items-center justify-end gap-3 pt-4">
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-muted hidden items-center gap-2 text-[13px] font-medium sm:inline-flex">
                <span className="text-ink font-semibold">Mercora AI</span>
                <span className="text-faint">High</span>
                <ChevronDown className="text-faint size-3.5" strokeWidth={2.25} aria-hidden />
              </span>
              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                aria-label="Send message"
                className={cn(
                  'motion-micro grid size-11 shrink-0 place-items-center rounded-full transition-[background-color,transform]',
                  canSend
                    ? 'bg-brand-blue hover:bg-brand-blue-deep text-white motion-safe:hover:scale-[1.02] motion-safe:active:scale-95'
                    : 'bg-surface-sunken text-faint cursor-not-allowed',
                )}
              >
                <ArrowUp className="size-4.5" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 px-1">
          <p className="text-faint text-[11px] font-medium">
            <kbd className="bg-surface-sunken rounded-sm px-1 font-sans font-bold">Enter</kbd> to
            send ·{' '}
            <kbd className="bg-surface-sunken rounded-sm px-1 font-sans font-bold">Shift+Enter</kbd>{' '}
            for a new line
          </p>
          {nearLimit ? (
            <span
              className={cn(
                'nums text-[11px] font-bold',
                value.length >= MAX_LENGTH ? 'text-danger' : 'text-warning',
              )}
              aria-live="polite"
            >
              {MAX_LENGTH - value.length} left
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
