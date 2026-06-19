/**
 * Parse a user-entered number, accepting a comma OR a dot as the decimal
 * separator (e.g. French "72,5" as well as "72.5"). Returns NaN for junk, like
 * Number() — callers already guard on that.
 */
export function parseDecimal(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

/** Format a numeric amount + optional unit for display, e.g. (600, "g") → "600 g". */
export function formatQty(amount: number | null, unit: string | null): string {
  if (amount == null) return '';
  const n = Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
  return unit ? `${n} ${unit}` : n;
}
