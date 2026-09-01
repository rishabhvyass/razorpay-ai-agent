/**
 * Display normalisation for model text.
 *
 * The agent is prompted for plain prose, but a model will still emit `**bold**` and
 * `- ` bullets from habit, and a bubble that shows literal asterisks reads as a bug on
 * the one screen this product is judged on.
 *
 * This strips those markers. It deliberately does NOT render markdown: nothing here
 * produces markup, so there is no path from model output to HTML. The text stays text -
 * it just stops wearing punctuation that was meant for a renderer that does not exist.
 */

/** `**bold**`, `__bold__`, `*em*`, `_em_` - marker removed, words kept. */
const EMPHASIS = /(\*\*|__)(?=\S)([\s\S]*?\S)\1|(\*|_)(?=\S)([^*_\n]*?\S)\3/g;

/** A leading `- `, `* ` or `+ ` bullet, which the layout already implies. */
const BULLET = /^[ \t]*[-*+][ \t]+/gm;

/** `### Heading` at the start of a line. */
const HEADING = /^[ \t]*#{1,6}[ \t]+/gm;

export function plainText(input: string): string {
  return input
    .replace(HEADING, '')
    .replace(BULLET, '')
    // Typed explicitly: the lib signature hands replacer arguments through as `any`,
    // and the capture groups are alternatives, so each one is a string or absent.
    .replace(
      EMPHASIS,
      (
        _match: string,
        _strongMarker: string | undefined,
        strong: string | undefined,
        _emMarker: string | undefined,
        em: string | undefined,
      ) => strong ?? em ?? '',
    )
    .replace(/`([^`\n]+)`/g, '$1');
}
