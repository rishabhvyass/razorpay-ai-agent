/**
 * Money.
 *
 * Every monetary value in this system is an integer count of minor units - paise
 * for INR. Rs 1,499.00 is 149900, always. There is no float anywhere in the money
 * path: not in the database, not in the API, not in the agent's tool arguments.
 *
 * This is not pedantry. `0.1 + 0.2 !== 0.3` in IEEE-754, and Razorpay's API takes
 * `amount` in the smallest currency unit precisely so that clients cannot get
 * this wrong. Keeping the same representation end to end means there is never a
 * conversion to forget.
 *
 * The only place a decimal appears is `formatMinorUnits`, for display.
 *
 * NOTE: this module is an addition to the specified folder structure. It exists
 * so that arithmetic and formatting on money live in exactly one place rather
 * than being repeated in productRepo and orderRepo.
 */

/**
 * Digits after the decimal point, per ISO 4217. Only currencies the demo could
 * plausibly use are listed; anything else falls back to 2, which is correct for
 * the large majority of currencies.
 */
const MINOR_UNIT_DIGITS: Readonly<Record<string, number>> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
  SGD: 2,
  JPY: 0, // zero-decimal
  KWD: 3,
};

export function minorUnitDigits(currency: string): number {
  return MINOR_UNIT_DIGITS[currency.toUpperCase()] ?? 2;
}

/**
 * `Number.MAX_SAFE_INTEGER` is far too permissive for an order total, and
 * Postgres `INTEGER` tops out at 2,147,483,647 anyway - which is Rs 21,474,836.47.
 * Refusing anything larger keeps a bad quantity from becoming a silent overflow
 * at the database boundary.
 */
export const MAX_AMOUNT_MINOR = 2_147_483_647;

export function isValidMinorAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_AMOUNT_MINOR;
}

/**
 * Line total for `quantity` units at `unitPriceMinor`.
 *
 * Integer multiplication, then an explicit range check - so an absurd quantity
 * fails here with a clear error rather than as a Postgres integer-out-of-range
 * deep inside an insert.
 */
export function lineTotalMinor(unitPriceMinor: number, quantity: number): number {
  if (!Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 0) {
    throw new RangeError(`unit price must be a non-negative integer, received ${unitPriceMinor}`);
  }
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new RangeError(`quantity must be a positive integer, received ${quantity}`);
  }

  const total = unitPriceMinor * quantity;

  if (!isValidMinorAmount(total)) {
    throw new RangeError(
      `order total ${total} exceeds the maximum supported amount ${MAX_AMOUNT_MINOR}`,
    );
  }

  return total;
}

/** 179900, 'INR' -> "₹1,799.00". Display only - never fed back into arithmetic. */
export function formatMinorUnits(amountMinor: number, currency: string): string {
  const digits = minorUnitDigits(currency);
  const major = amountMinor / 10 ** digits;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major);
  } catch {
    // Reached only for a MALFORMED code, not merely an unknown one. ECMA-402
    // accepts any well-formed 3-ASCII-letter code, so 'ZZZ' formats happily as
    // "ZZZ 10.00" and never lands here; 'US', 'RUPEES' and '' throw RangeError.
    // Degrading rather than rethrowing matters because this runs inside
    // toPublicProduct / toPublicOrder - a bad currency string in one row should
    // not take down the whole response.
    return `${currency.toUpperCase()} ${major.toFixed(digits)}`;
  }
}

/**
 * Parse a human-entered major-unit amount into minor units. "1499.50" -> 149950.
 *
 * String-based on purpose: `Math.round(1499.5 * 100)` is fine, but
 * `Math.round(19.99 * 100)` is 1999 only by luck of rounding, and the family of
 * inputs where it is not lucky is exactly the family that produces off-by-one
 * paise. Shifting the decimal in the string cannot drift.
 */
export function parseMajorToMinor(input: string, currency = 'INR'): number {
  const digits = minorUnitDigits(currency);
  const cleaned = input.replace(/[\s,₹]/g, '');

  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (match === null || (match[2] === '' && match[3] === undefined)) {
    throw new RangeError(`cannot parse "${input}" as a monetary amount`);
  }

  const sign = match[1] === '-' ? -1 : 1;
  const whole = match[2] ?? '';
  const fraction = (match[3] ?? '').padEnd(digits, '0');

  if (fraction.length > digits) {
    throw new RangeError(
      `"${input}" has more than ${digits} decimal places, which ${currency} cannot represent`,
    );
  }

  const minor = sign * Number.parseInt(`${whole === '' ? '0' : whole}${fraction}`, 10);

  // Range-check before returning rather than leaving it to the caller. Every
  // caller stores or compares this against `price`/`amount`, which are Postgres
  // INTEGER; an out-of-range value that escapes here reaches the database as an
  // uncastable literal and surfaces as a 500 instead of the 400 it is. Parsing an
  // amount the system cannot represent is a parse failure, so it is reported the
  // same way as unparseable text.
  if (!isValidMinorAmount(minor)) {
    throw new RangeError(
      `"${input}" is outside the supported range (max ${MAX_AMOUNT_MINOR} minor units)`,
    );
  }

  return minor;
}
