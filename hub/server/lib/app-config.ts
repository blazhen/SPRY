// Marketplace app settings (the install flow). Read process.env INSIDE the function, never at module scope.
// Secrets here (client secret, shared secret) are never printed, logged or returned.
export interface AppConfig {
  clientId: string;
  clientSecret: string;
  sharedSecret: string;
  /** Full address of the platform's token endpoint (HUB_APP_TOKEN_URL). Kept out of the repo on purpose. */
  tokenUrl: string;
  redirectUri: string;
  /** The app id: HUB_APP_ID, else the part of the client id before the first dash. */
  appId: string;
  /** Optional PEM public key for webhook signatures, and the name of the header that carries the signature. Both or neither. */
  webhookPublicKey: string;
  webhookSigHeader: string;
}

export const DEFAULT_REDIRECT_URI = "https://hub.systemations.ai/oauth/callback";

export function getAppConfig(): AppConfig {
  const e = process.env;
  const clientId = (e.HUB_APP_CLIENT_ID ?? "").trim();
  return {
    clientId,
    clientSecret: (e.HUB_APP_CLIENT_SECRET ?? "").trim(),
    sharedSecret: (e.HUB_APP_SHARED_SECRET ?? "").trim(),
    tokenUrl: (e.HUB_APP_TOKEN_URL ?? "").trim(),
    redirectUri: (e.HUB_APP_REDIRECT_URI ?? "").trim() || DEFAULT_REDIRECT_URI,
    appId: (e.HUB_APP_ID ?? "").trim() || clientId.split("-")[0],
    webhookPublicKey: (e.HUB_APP_WEBHOOK_PUBLIC_KEY ?? "").trim(),
    webhookSigHeader: (e.HUB_APP_WEBHOOK_SIG_HEADER ?? "").trim().toLowerCase(),
  };
}

/** True when the OAuth calls can be made. */
export function oauthConfigured(c: AppConfig = getAppConfig()): boolean {
  return !!(c.clientId && c.clientSecret && c.tokenUrl);
}
