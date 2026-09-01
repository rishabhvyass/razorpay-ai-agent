import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * A copyable snippet.
 *
 * Integration copy is worthless if it cannot be lifted exactly, so the copy button
 * writes the same string that is rendered - there is no separate "clean" version that
 * could drift from what the reader sees. Horizontal scroll rather than wrapping: a
 * wrapped shell command is a command that breaks when pasted.
 */
export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string;
  /** What this is, e.g. `bash` or `index.html`. */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <figure className={cn('rounded-card bg-surface-sunken overflow-hidden', className)}>
      <figcaption className="border-line/60 flex items-center justify-between gap-3 border-b px-4 py-2">
        <span className="text-muted font-mono text-[11px] font-semibold">{label}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              },
              () => setCopied(false),
            );
          }}
          className="text-muted hover:bg-surface hover:text-ink -mr-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-control px-2 text-[12px] font-semibold transition-colors"
        >
          {copied ? (
            <Check className="text-success size-3.5" strokeWidth={2.5} aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>

      <pre className="scrollbar-slim overflow-x-auto px-4 py-3.5">
        <code className="text-ink font-mono text-[12px] leading-relaxed whitespace-pre">{code}</code>
      </pre>
    </figure>
  );
}
