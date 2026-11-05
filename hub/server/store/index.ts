import type { HubStore } from "./types.js";

let registered: HubStore | null = null;
let fileStore: HubStore | null = null;

/** Called by the TanStack wrapper once it has built the Supabase store. */
export function setStore(store: HubStore | null): void {
  registered = store;
}

/** SPRY_STORE=file uses the JSON-file adapter (local testing). Otherwise the registered store, or null. */
export async function getStore(): Promise<HubStore | null> {
  if (process.env.SPRY_STORE === "file") {
    if (!fileStore) fileStore = (await import("./file.js")).createFileStore();
    return fileStore;
  }
  return registered;
}

export { ConflictError } from "./types.js";
export type { HubStore, Rec } from "./types.js";
