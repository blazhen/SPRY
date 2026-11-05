import { getAppConfig, oauthConfigured } from "./app-config.js";

// Calls to the platform's token endpoint. Errors never carry the response body, the code, the tokens or the secret.
export class OAuthError extends Error {
  /** invalid: the platform said no (bad or used code, revoked refresh token). unavailable: network, timeout or 5xx. */
  constructor(
    public kind: "not-configured" | "invalid" | "unavailable" | "bad-answer",
    public status = 0,
  ) {
    super("OAuth " + kind + (status ? " (" + status + ")" : ""));
    this.name = "OAuthError";
  }
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** ISO time the access token stops working. */
  expiresAt: string;
  scope: string;
  userType: string;
  locationId: string;
  companyId: string;
  userId: string;
}

async function tokenCall(form: Record<string, string>, now: number): Promise<TokenSet> {
  const c = getAppConfig();
  if (!oauthConfigured(c)) throw new OAuthError("not-configured");
  const body = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    user_type: "Location",
    ...form,
  });
  let res: Response;
  try {
    res = await fetch(c.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new OAuthError("unavailable");
  }
  if (res.status >= 500 || res.status === 429) throw new OAuthError("unavailable", res.status);
  if (!res.ok) throw new OAuthError("invalid", res.status);
  let j: Record<string, unknown>;
  try {
    j = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new OAuthError("bad-answer", res.status);
  }
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const expiresIn = Number(j.expires_in);
  const access = s(j.access_token);
  if (!access || !Number.isFinite(expiresIn) || expiresIn <= 0) throw new OAuthError("bad-answer", res.status);
  return {
    accessToken: access,
    refreshToken: s(j.refresh_token),
    expiresAt: new Date(now + expiresIn * 1000).toISOString(),
    scope: s(j.scope),
    userType: s(j.userType),
    locationId: s(j.locationId),
    companyId: s(j.companyId),
    userId: s(j.userId),
  };
}

/** One-time code from the install redirect to tokens. */
export function exchangeCode(code: string, now: number = Date.now()): Promise<TokenSet> {
  return tokenCall(
    { grant_type: "authorization_code", code, redirect_uri: getAppConfig().redirectUri },
    now,
  );
}

/** Refresh token to a new token set (the platform issues a new refresh token each time). */
export function refreshTokens(refreshToken: string, now: number = Date.now()): Promise<TokenSet> {
  return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, now);
}
