/**
 * Money formatting.
 *
 * The backend stores and returns every amount as an integer in MINOR UNITS
 * (paise for INR). This file is the only place in the frontend that divides by
 * 100, and every function names its unit.
 *
 * The rule this protects: a display bug that is off by 100x still renders as a
 * believable price. "₹14.99" for a ₹1,499 hoodie looks like a cheap product, not
 * like a bug, so it survives review. Centralising the conversion means there is
 * one line to audit rather than one per component.
 */

/** Minor units per major unit. INR, like most currencies here, is 100. */
const MINOR_PER_MAJOR: Record<string, number> = {
  INR: 100,
  USD: 100,
  EUR: 100,
  GBP: 100,
};

function divisorFor(currency: string): number {
  return MINOR_PER_MAJOR[currency.toUpperCase()] ?? 100;
}

/**
 * Format an amount held in minor units for display.
 *
 * formatMinor(149900, 'INR') -> "₹1,499"
 * formatMinor(149950, 'INR') -> "₹1,499.50"
 *
 * Whole amounts drop the decimals, because a catalogue of round rupee prices
 * reads better without a column of ".00". Fractional amounts always show two.
 */
export function formatMinor(amountMinor: number, currency = 'INR'): string {
  const divisor = divisorFor(currency);
  const major = amountMinor / divisor;
  const isWhole = amountMinor % divisor === 0;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: isWhole ? 0 : 2,
    }).format(major);
  } catch {
    // Unknown currency code - show the number with the code rather than throwing
    // inside a render.
    return `${currency.toUpperCase()} ${major.toFixed(isWhole ? 0 : 2)}`;
  }
}

/** Digits only, no symbol - for inputs and aria-labels that supply their own. */
export function minorToMajorNumber(amountMinor: number, currency = 'INR'): number {
  return amountMinor / divisorFor(currency);
}

/** Major units (from a filter input the user typed) to minor units for the API. */
export function majorToMinor(major: number, currency = 'INR'): number {
  return Math.round(major * divisorFor(currency));
}

/**
 * Spoken form for screen readers. Currency symbols are read inconsistently
 * across screen readers, so status-bearing amounts get an explicit label.
 */
export function formatMinorSpoken(amountMinor: number, currency = 'INR'): string {
  const major = minorToMajorNumber(amountMinor, currency);
  const unit = currency.toUpperCase() === 'INR' ? 'rupees' : currency.toUpperCase();
  return `${major.toLocaleString('en-IN')} ${unit}`;
}
