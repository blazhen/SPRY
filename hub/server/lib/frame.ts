// Who may show the Hub page inside a frame. The list comes from HUB_FRAME_ANCESTORS (host setting, so no vendor domain is
// written in the repo): sources separated by spaces or commas, for example `https://app.example.com https://*.example.org`.
// Only plain host sources are kept (optional scheme, optional leading `*.`, a dotted host or localhost, optional port).
// Anything else is dropped, so a bad value can never add a header line, a directive or a wildcard for everyone.
const SOURCE = /^(https?:\/\/)?(\*\.)?([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+(:\d{1,5})?$|^(https?:\/\/)?localhost(:\d{1,5})?$/;

export function parseFrameAncestors(raw: string | undefined): string[] {
  const out: string[] = [];
  for (const t of (raw ?? "").split(/[\s,]+/)) {
    if (!t || !SOURCE.test(t) || out.includes(t)) continue;
    out.push(t);
    if (out.length >= 30) break;
  }
  return out;
}

/** The Content-Security-Policy value for the page: our own origin plus the allowed list. With an empty list, only ourselves. */
export function frameAncestorsPolicy(raw: string | undefined): string {
  return "frame-ancestors 'self'" + parseFrameAncestors(raw).map((s) => " " + s).join("");
}
