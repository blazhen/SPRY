// Quote from inspection notes: the agent side. Pure functions (no network, no config), so the unit test can run them.
// The agent (built in Agent Studio, see HUB-NOTES-AGENT-SETUP.md) answers in text. We ask it for JSON, find the JSON in
// the text, and check every field again here. The facts come back in the same shape the Hub's rule reader returns
// (ReadResult in src/lib/notesToQuoteRead.ts). Prices are never sent to the agent and never read from its answer.

export const PARTS = ["roof", "walls", "ceiling", "subfloor", "unknown"] as const;
export const EXTRA_KINDS = ["removeBatts", "skipBin", "masking", "fireCoating", "edgeSealing", "accessTime"] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const posNum = (v: unknown, hi: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v <= hi ? v : null;

export interface AgentRead {
  items: {
    id: string;
    part: (typeof PARTS)[number];
    places: string[];
    areaM2: number | null;
    pieces: { text: string; m2: number }[];
    thicknessMm?: number;
    foam?: "open" | "closed";
    rValue?: number;
    approx?: boolean;
    partGuessed?: boolean;
    noUnit?: boolean;
    excluded?: string;
    phrase: string;
  }[];
  extras: { id: string; kind: (typeof EXTRA_KINDS)[number]; phrase: string; qty: number | null }[];
  storeys?: { count: number; phrase: string };
  access: { text: string; phrase: string }[];
  exclusions: { text: string; phrase: string }[];
  totals: { m2: number; phrase: string }[];
  leftovers: string[];
  unusedNumbers: { value: string; phrase: string }[];
}

/** The message sent to the agent: names and the redacted notes. No customer details, no prices. */
export function buildAgentMessage(
  redactedNotes: string,
  ctx: { productType: string; foamNames: string[]; productNames: string[] },
): string {
  const names = (a: string[]) => a.filter((x) => typeof x === "string").slice(0, 60).map((x) => x.slice(0, 80));
  return JSON.stringify({
    notes: redactedNotes,
    productType: String(ctx.productType).slice(0, 40),
    foamNames: names(ctx.foamNames),
    productNames: names(ctx.productNames),
  });
}

/** Find the JSON object in the agent's text (it may be wrapped in a code fence or a sentence). */
export function extractJson(reply: string): unknown {
  const a = reply.indexOf("{");
  const b = reply.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(reply.slice(a, b + 1));
  } catch {
    return null;
  }
}

const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);

/** Check the agent's answer and turn it into the Hub's ReadResult. Returns null when nothing usable is in it. */
export function readFromAgentReply(reply: string): AgentRead | null {
  const j = extractJson(reply);
  if (!isObj(j)) return null;

  const items: AgentRead["items"] = [];
  for (const raw of list(j.items, 40)) {
    if (!isObj(raw)) continue;
    const part = PARTS.find((p) => p === raw.part);
    if (!part) continue;
    const areaM2 = raw.areaM2 === null || raw.areaM2 === undefined ? null : posNum(raw.areaM2, 100000);
    if (raw.areaM2 !== null && raw.areaM2 !== undefined && areaM2 === null) continue; // a silly size drops the item
    const pieces = list(raw.pieces, 40)
      .filter(isObj)
      .map((p) => ({ text: text(p.text, 80), m2: posNum(p.m2, 100000) }))
      .filter((p): p is { text: string; m2: number } => p.m2 !== null);
    const thick = posNum(raw.thicknessMm, 1000);
    const rv = posNum(raw.rValue, 20);
    const item: AgentRead["items"][number] = {
      id: "a" + (items.length + 1),
      part,
      places: list(raw.places, 8).map((x) => text(x, 40).toLowerCase()).filter(Boolean),
      areaM2,
      pieces,
      phrase: text(raw.phrase, 200),
    };
    if (thick !== null) item.thicknessMm = thick;
    if (raw.foam === "open" || raw.foam === "closed") item.foam = raw.foam;
    if (rv !== null) item.rValue = rv;
    if (raw.approx === true) item.approx = true;
    if (raw.partGuessed === true) item.partGuessed = true;
    if (raw.noUnit === true) item.noUnit = true;
    if (text(raw.excluded)) item.excluded = text(raw.excluded);
    items.push(item);
  }

  const extras: AgentRead["extras"] = [];
  for (const raw of list(j.extras, 20)) {
    if (!isObj(raw)) continue;
    const kind = EXTRA_KINDS.find((k) => k === raw.kind);
    if (!kind) continue;
    extras.push({ id: "x" + (extras.length + 1), kind, phrase: text(raw.phrase), qty: posNum(raw.qty, 100000) });
  }

  const notes = (v: unknown) =>
    list(v, 20)
      .filter(isObj)
      .map((n) => ({ text: text(n.text), phrase: text(n.phrase) }))
      .filter((n) => n.text);

  const out: AgentRead = {
    items,
    extras,
    access: notes(j.access),
    exclusions: notes(j.exclusions),
    totals: list(j.totals, 10)
      .filter(isObj)
      .map((t) => ({ m2: posNum(t.m2, 100000), phrase: text(t.phrase) }))
      .filter((t): t is { m2: number; phrase: string } => t.m2 !== null),
    leftovers: [],
    unusedNumbers: [],
  };
  if (isObj(j.storeys)) {
    const c = posNum(j.storeys.count, 10);
    if (c !== null) out.storeys = { count: c, phrase: text(j.storeys.phrase) };
  }
  // An answer with no items and no extras is not a read: the Hub falls back to its rules.
  if (!out.items.length && !out.extras.length) return null;
  return out;
}
