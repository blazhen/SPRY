import { gate } from "../lib/auth.js";
import { ConfigError, crmFetch, getConfig } from "../lib/env.js";
import { jsonError, jsonOk, readJsonCapped } from "../lib/http.js";
import { buildAgentMessage, readFromAgentReply } from "../lib/notes-agent.js";

// Quote from inspection notes: the SMART READER endpoint.
//
// It asks one Agent Studio Managed Agent (set by SPRY_NOTES_AGENT_ID, built in the Dev sub-account, see HUB-NOTES-AGENT-SETUP.md)
// to read the note text and answer with JSON facts: parts, m2, thickness, foam, R-value, extras, left-out parts. No API
// key of our own: the call uses the same integration token as the rest of the server. The Hub then prices the facts
// itself. Prices are never sent to the agent and never taken from its answer.
//
// While SPRY_NOTES_AGENT_ID is not set this answers 501 and calls nothing. Any answer other than 200 makes the browser
// use its built-in rules, so a missing or failing agent never blocks a quote.
//
// POST /api/notes-to-quote { notes: string, productType, foamNames: string[], productNames: string[] }
//   -> 200 { read }   the facts (same shape as the rule reader)
//   -> 501 { error }  agent not set up
//   -> 502 { error }  the agent failed or answered something unusable

const MAX_BODY = 32 * 1024;
const MAX_NOTES = 6000;
const TIMEOUT_MS = 20000;

/**
 * Remove what must not leave the server before the text goes to the agent. Phone numbers, emails and street
 * addresses are cut with simple patterns (best effort; the notes screen also tells Glenn not to type them).
 */
export function redactNotes(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]")
    .replace(/(?:\+?61|0)[\s-]?\d(?:[\s-]?\d){7,9}/g, "[phone]")
    .replace(/\b\d{1,5}[a-z]?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ct|Court|Pl|Place|Cres|Crescent|Pde|Parade|Ln|Lane|Hwy|Highway)\b\.?/g, "[address]");
}

const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  const agentId = (process.env.SPRY_NOTES_AGENT_ID ?? "").trim();
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(agentId)) return jsonError(501, "The smart reader is not switched on.");

  const body = await readJsonCapped(request, MAX_BODY);
  if (!body.ok) return jsonError(400, "Bad request");
  const notes = typeof body.value.notes === "string" ? body.value.notes.slice(0, MAX_NOTES) : "";
  if (!notes.trim()) return jsonError(400, "No notes");

  const message = buildAgentMessage(redactNotes(notes), {
    productType: typeof body.value.productType === "string" ? body.value.productType : "",
    foamNames: strList(body.value.foamNames),
    productNames: strList(body.value.productNames),
  });

  try {
    // Managed Agents route: needs Version v3 and a fresh Idempotency-Key per call (one note, one turn, no session kept).
    const res = await crmFetch(`/agent-studio/managed-agents/${agentId}/execute`, {
      method: "POST",
      headers: { Version: "v3", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ message, locationId: getConfig().locationId }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return jsonError(502, "The smart reader did not answer.");
    const j = (await res.json().catch(() => null)) as { success?: boolean; finalText?: unknown } | null;
    const read = j && j.success !== false && typeof j.finalText === "string" ? readFromAgentReply(j.finalText) : null;
    if (!read) return jsonError(502, "The smart reader gave an answer the Hub could not use.");
    return jsonOk({ read });
  } catch (e) {
    if (e instanceof ConfigError) return jsonError(501, "The smart reader is not switched on.");
    return jsonError(502, "The smart reader took too long or could not be reached.");
  }
}
