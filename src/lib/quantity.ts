/** Format a numeric amount + optional unit for display, e.g. (600, "g") → "600 g". */
export function formatQty(amount: number | null, unit: string | null): string {
  if (amount == null) return '';
  const n = Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
  return unit ? `${n} ${unit}` : n;
}
