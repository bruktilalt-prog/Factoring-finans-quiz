/** Compact Norwegian kr formatting for the estimated factoring frame —
 *  e.g. 1250000 -> "1,3 mill kr", 850000 -> "850 000 kr". */
export function formatKr(value: number | null | undefined): string {
  if (value == null) return "—";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} mill kr`;
  }
  return `${value.toLocaleString("nb-NO")} kr`;
}
