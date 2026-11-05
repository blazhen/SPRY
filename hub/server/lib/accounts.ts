import { getConfig } from "./env.js";
import { ID } from "./crm-extended.js";
import { OAuthError, refreshTokens, type TokenSet } from "./oauth.js";
import { ConflictError, getStore, type HubStore } from "../store/index.js";

// One record per installed account, keyed by location id, in the store collection "accounts".
// "accounts" is NOT in the /api/store allow list on purpose: the tokens in it must never reach a browser.
// Tokens sit in the store as they are (the store is server-only: RLS on, no policies). Never print, log or return them.
export const ACCOUNTS = "accounts";
/** Refresh when the access token has less than this left. */
export const REFRESH_SKEW_MS = 10 * 60 * 1000;

export interface Account {
  locationId: string;
  companyId: string;
  userId: string;
  status: "active" | "uninstalled";
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
  installedAt: string;
  uninstalledAt?: string;
  /** Set when the platform refused our refresh token: the account must be installed again. */
  needsReauth?: boolean;
}

export type AccountErrorKind = "no-store" | "unknown" | "uninstalled" | "no-token" | "refresh-failed";
export class AccountError extends Error {
  constructor(public kind: AccountErrorKind) {
    super("Account " + kind);
    this.name = "AccountError";
  }
}

export const validLocationId = (s: string): boolean => ID.test(s);

async function needStore(): Promise<HubStore> {
  const s = await getStore();
  if (!s) throw new AccountError("no-store");
  return s;
}

export async function getAccount(locationId: string): Promise<Account | null> {
  if (!validLocationId(locationId)) return null;
  const rec = await (await needStore()).get(ACCOUNTS, locationId);
  return rec ? (rec.data as Account) : null;
}

/** Read, change, write with the store's lost-update guard; retries when another writer got in first. */
export async function mutateAccount(
  locationId: string,
  fn: (current: Account | null) => Account | null,
): Promise<Account | null> {
  const store = await needStore();
  for (let i = 0; i < 4; i++) {
    const rec = await store.get(ACCOUNTS, locationId);
    const cur = rec ? (rec.data as Account) : null;
    const next = fn(cur);
    if (!next) return cur;
    try {
      await store.put(ACCOUNTS, locationId, next, rec?.updatedAt);
      return next;
    } catch (e) {
      if (!(e instanceof ConflictError)) throw e;
    }
  }
  throw new Error("Account update conflict");
}

/** The install callback: save the tokens, mark the account active. Never deletes anything. */
export async function saveInstall(t: TokenSet, now: number = Date.now()): Promise<Account> {
  const stamp = new Date(now).toISOString();
  const next = await mutateAccount(t.locationId, (cur) => ({
    locationId: t.locationId,
    companyId: t.companyId || cur?.companyId || "",
    userId: t.userId || cur?.userId || "",
    status: "active",
    accessToken: t.accessToken,
    refreshToken: t.refreshToken,
    expiresAt: t.expiresAt,
    scope: t.scope,
    installedAt: stamp,
  }));
  return next as Account;
}

/** Webhook: mark active or uninstalled. Keeps the tokens and every other record. Returns false when the account is unknown. */
export async function setStatus(
  locationId: string,
  status: "active" | "uninstalled",
  ids: { companyId?: string; userId?: string } = {},
  now: number = Date.now(),
  createIfMissing = false,
): Promise<boolean> {
  let known = true;
  await mutateAccount(locationId, (cur) => {
    if (!cur && !createIfMissing) {
      known = false;
      return null;
    }
    const base: Account = cur ?? {
      locationId,
      companyId: "",
      userId: "",
      status,
      accessToken: "",
      refreshToken: "",
      expiresAt: "",
      scope: "",
      installedAt: new Date(now).toISOString(),
    };
    const next: Account = { ...base, status, companyId: ids.companyId || base.companyId, userId: ids.userId || base.userId };
    if (status === "uninstalled") next.uninstalledAt = new Date(now).toISOString();
    else delete next.uninstalledAt;
    return next;
  });
  return known;
}

const inflight = new Map<string, Promise<string>>();

const fresh = (a: Account, now: number) => !!a.accessToken && Date.parse(a.expiresAt) - now > REFRESH_SKEW_MS;

/**
 * The access token for one account. Refreshes it first when it has under 10 minutes left and stores the new tokens.
 * Concurrent calls for the same account share one refresh (the platform's refresh tokens are single use). If another server
 * instance refreshed first, its stored tokens are used. Throws AccountError; the message never holds a token.
 */
export async function getAccessToken(locationId: string, now: number = Date.now()): Promise<string> {
  const a = await getAccount(locationId);
  if (!a) throw new AccountError("unknown");
  if (a.status !== "active") throw new AccountError("uninstalled");
  if (!a.accessToken) throw new AccountError("no-token");
  if (fresh(a, now)) return a.accessToken;
  if (!a.refreshToken) throw new AccountError("refresh-failed");
  const running = inflight.get(locationId);
  if (running) return running;
  const p = (async () => {
    try {
      const t = await refreshTokens(a.refreshToken, now);
      const saved = await mutateAccount(locationId, (cur) => {
        if (!cur) return null;
        const next: Account = {
          ...cur,
          accessToken: t.accessToken,
          refreshToken: t.refreshToken || cur.refreshToken,
          expiresAt: t.expiresAt,
          scope: t.scope || cur.scope,
        };
        delete next.needsReauth;
        return next;
      });
      return (saved ?? a).accessToken;
    } catch (e) {
      if (e instanceof OAuthError && e.kind === "invalid") {
        // Maybe another instance already used this refresh token: take its stored result.
        const again = await getAccount(locationId);
        if (again && again.status === "active" && fresh(again, now) && again.accessToken !== a.accessToken) return again.accessToken;
        await mutateAccount(locationId, (cur) => (cur ? { ...cur, needsReauth: true } : null));
      }
      throw new AccountError("refresh-failed");
    }
  })().finally(() => inflight.delete(locationId));
  inflight.set(locationId, p);
  return p;
}

/** Like crmFetch, but with the token of one installed account (and that account's location). Same address as the fixed account. */
export async function crmFetchForAccount(
  locationId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = getConfig().base;
  if (!base) throw new AccountError("no-token");
  const token = await getAccessToken(locationId);
  const headers: Record<string, string> = { Authorization: "Bearer " + token, Version: "2021-07-28", Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(base + path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });
}
