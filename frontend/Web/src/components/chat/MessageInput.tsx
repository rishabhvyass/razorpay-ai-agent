import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';
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
  placeholder = 'Describe what you are looking for…',
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
    <div className="border-line bg-surface/90 border-t px-4 py-3 backdrop-blur-md md:px-6">
      <div
        className={cn(
          'rounded-card border-line-strong bg-surface flex items-end gap-2 border px-3 py-2 transition-colors',
          'focus-within:border-accent-300 focus-within:ring-accent-100 focus-within:ring-2',
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
              ? 'bg-accent hover:bg-accent-700 text-white'
              : 'bg-surface-sunken text-faint cursor-not-allowed',
          )}
        >
          <ArrowUp className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 px-1">
        <p className="text-faint text-[11px]">
          <kbd className="font-sans font-medium">Enter</kbd> to send ·{' '}
          <kbd className="font-sans font-medium">Shift+Enter</kbd> for a new line
        </p>
        {nearLimit ? (
          <p className="text-faint nums text-[11px]">
            {value.length}/{MAX_LENGTH}
          </p>
        ) : null}
      </div>
    </div>
  );
}
