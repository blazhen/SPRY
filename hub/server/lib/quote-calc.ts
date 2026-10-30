// Minimal port of src/lib/calc.ts (money rules only). Keep in step with it: GST once on the subtotal, half up to the cent.
export const GST_RATE = 0.1;

export interface CalcLine { id: string; qty: number; unitPrice: number | null }
export interface CalcUpgrade { lineId: string; unitPrice: number | null; ticked: boolean }

export function roundHalfUp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const text = String(abs);
  const scaled = text.includes('e') ? abs * 100 + Number.EPSILON * 100 : Number(text + 'e2');
  const out = Math.round(scaled) / 100;
  return out === 0 ? 0 : sign * out;
}

const lineTotal = (l: CalcLine) => roundHalfUp((l.qty || 0) * (l.unitPrice ?? 0));
const upgradeTotal = (u: CalcUpgrade, lines: CalcLine[]) => roundHalfUp((lines.find((l) => l.id === u.lineId)?.qty || 0) * (u.unitPrice ?? 0));

/** Total inc GST (when gstApplies is not false) with only the ticked upgrades counted. */
export function quoteTotal(lines: CalcLine[], upgrades: CalcUpgrade[], gstApplies: boolean): number {
  const items = roundHalfUp(lines.reduce((s, l) => s + lineTotal(l), 0));
  const ups = roundHalfUp(upgrades.filter((u) => u.ticked).reduce((s, u) => s + upgradeTotal(u, lines), 0));
  const subtotal = roundHalfUp(items + ups);
  const gst = gstApplies ? roundHalfUp(subtotal * GST_RATE) : 0;
  return roundHalfUp(subtotal + gst);
}
