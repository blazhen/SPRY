// Server config. Read process.env INSIDE the function (never at module scope), so it works in any runtime.
export interface ServerConfig {
  token: string;
  base: string;
  locationId: string;
  iframeSecret: string;
  allowOpen: boolean;
  newJobStage: string;
  allowedOrigins: string[];
}

export class ConfigError extends Error {}

export function getConfig(): ServerConfig {
  const e = process.env;
  return {
    token: (e.SPRY_CRM_TOKEN ?? '').trim(),
    base: (e.SPRY_CRM_API_BASE ?? '').trim().replace(/\/+$/, ''),
    locationId: (e.SPRY_CRM_LOCATION_ID ?? '').trim(),
    iframeSecret: (e.SPRY_IFRAME_SECRET ?? '').trim(),
    // Open mode is for local development only: ignored (treated as unset) when NODE_ENV is production.
    allowOpen: e.SPRY_ALLOW_OPEN === '1' && e.NODE_ENV !== 'production',
    newJobStage: (e.SPRY_NEW_JOB_STAGE ?? '').trim() || 'New lead',
    allowedOrigins: (e.SPRY_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/** Call the CRM API. Returns the raw Response. Throws ConfigError when the server is not configured. */
export async function crmFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const c = getConfig();
  if (!c.token || !c.base || !c.locationId) throw new ConfigError('CRM connection not configured');
  const headers: Record<string, string> = {
    Authorization: 'Bearer ' + c.token,
    Version: '2021-07-28',
    Accept: 'application/json',
  };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(c.base + path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });
}
