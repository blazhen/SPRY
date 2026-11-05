import { AccountError, saveInstall, validLocationId } from "../lib/accounts.js";
import { clientIp, rateLimited } from "../lib/public-link.js";
import { exchangeCode, OAuthError } from "../lib/oauth.js";

// Served at /oauth/callback (NOT under /api; dev server alias, TanStack file oauth.callback.tsx).
// GET /oauth/callback?code= : the install redirect. The one-time code is exchanged for tokens, which are stored per account
// (store collection "accounts"), and a plain page says it is installed. No staff token: the platform's redirect carries none,
// and the code only works once and only with our client secret. The code and the tokens are never printed or logged.
const CODE = /^[A-Za-z0-9._~-]{8,512}$/;

function page(status: number, title: string, text: string): Response {
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>' + title + "</title>" +
    "<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;min-height:100vh;place-items:center;background:#f4f6fb;color:#14213d}" +
    "main{max-width:28rem;padding:2rem;margin:1rem;background:#fff;border-radius:12px;box-shadow:0 1px 8px rgba(0,0,0,.08)}h1{font-size:1.4rem;margin:0 0 .5rem}p{margin:0}</style>" +
    "</head><body><main><h1>" + title + "</h1><p>" + text + "</p></main></body></html>";
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  if (rateLimited("oauth-callback", clientIp(request))) return page(429, "Please wait", "Too many tries. Wait a minute and try again.");
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return page(400, "Not installed", "The install was cancelled. You can start it again from the app list.");
  const code = url.searchParams.get("code") ?? "";
  if (!CODE.test(code)) return page(400, "Not installed", "This install link is not valid. Start the install again from the app list.");
  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (e) {
    if (e instanceof OAuthError) {
      if (e.kind === "not-configured") return page(503, "Not ready", "The app is not set up on the server yet.");
      if (e.kind === "invalid") return page(400, "Not installed", "This install link has expired or was already used. Start the install again from the app list.");
    }
    return page(502, "Not installed", "The install could not be finished. Please try again in a few minutes.");
  }
  if (!validLocationId(tokens.locationId) || (tokens.userType && tokens.userType !== "Location"))
    return page(400, "Not installed", "This app installs on one account at a time. Choose an account and start the install again.");
  try {
    await saveInstall(tokens);
  } catch (e) {
    if (e instanceof AccountError && e.kind === "no-store") return page(503, "Not ready", "Storage is not set up on the server yet.");
    return page(500, "Not installed", "The install could not be saved. Please try again in a few minutes.");
  }
  return page(200, "Installed", "Systemations Hub is installed on this account. You can close this tab and open it from the menu.");
}
