/**
 * Currency and minor unit math helpers.
 *
 * Rule: 1 INR = 100 paise (minor units).
 * All monetary calculations on the backend are integers.
 */

export function formatMinorUnits(minorUnits: number, currency = 'INR'): string {
  const major = minorUnits / 100;
  if (currency.toUpperCase() === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(major);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(major);
}

export function formatPriceWithoutDecimals(minorUnits: number): string {
  const major = Math.round(minorUnits / 100);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(major);
}

export function lineTotalMinor(unitPriceMinor: number, quantity: number): number {
  return unitPriceMinor * quantity;
}
