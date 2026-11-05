export type Rec = { id: string; data: unknown; updatedAt: string };

/** Thrown by put() when ifUpdatedAt is older than the stored record (lost-update guard). */
export class ConflictError extends Error {
  constructor() {
    super("Conflict");
    this.name = "ConflictError";
  }
}

export interface HubStore {
  list(collection: string): Promise<Rec[]>;
  get(collection: string, id: string): Promise<Rec | null>;
  /** Insert or replace. When ifUpdatedAt is given and the stored record is newer, throws ConflictError. */
  put(collection: string, id: string, data: unknown, ifUpdatedAt?: string): Promise<Rec>;
  delete(collection: string, id: string): Promise<void>;
}

/** True when the stored record is newer than what the client last saw. */
export function isStale(storedUpdatedAt: string, ifUpdatedAt: string): boolean {
  const a = Date.parse(storedUpdatedAt);
  const b = Date.parse(ifUpdatedAt);
  if (Number.isNaN(b)) return false;
  return a > b;
}
