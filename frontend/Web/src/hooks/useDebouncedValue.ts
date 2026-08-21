import { useEffect, useState } from 'react';

/**
 * Debounce a value.
 *
 * Used by the product filter bar so typing "hoodie" issues one request instead of
 * six. Debouncing the *value* rather than the handler keeps the input fully
 * controlled, so it never lags behind the keystrokes.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
