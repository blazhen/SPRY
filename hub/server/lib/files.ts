// Job document files: the storage interface, its registry and the pure rules (allowed types, size, names, paths).
// The registered storage is set by the host wrapper (or the dev server, which installs an in-memory fake).

export interface FileStorage {
  createSignedUploadUrl(
    path: string,
    expiresIn: number,
  ): Promise<{ url: string; headers: Record<string, string> }>;
  createSignedDownloadUrl(path: string, expiresIn: number, downloadName?: string): Promise<string>;
  remove(path: string): Promise<void>;
  head(path: string): Promise<{ size: number } | null>;
}

let registered: FileStorage | null = null;

/** Called by the host wrapper once it has built the real storage (or by the dev server with the fake). */
export function setFileStorage(s: FileStorage | null): void {
  registered = s;
}

export async function getFileStorage(): Promise<FileStorage | null> {
  return registered;
}

export const MAX_BYTES = 26214400; // 25 MB
export const MAX_FILES_PER_JOB = 50;

const IMAGE_MIME = /^image\/[A-Za-z0-9.+-]+$/;

/** Allowed extension (lower case, no dot) to the check its declared MIME type must pass. */
export const ALLOWED: Record<string, string | RegExp> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  png: IMAGE_MIME,
  jpg: IMAGE_MIME,
  jpeg: IMAGE_MIME,
  gif: IMAGE_MIME,
  webp: IMAGE_MIME,
  heic: IMAGE_MIME,
};

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g;

/** Last path segment, control characters removed, trimmed. Used for the name people see. */
export function cleanName(name: string): string {
  const base = String(name).replace(CONTROL, "").split(/[\\/]/).pop() ?? "";
  return base.trim();
}

/** Lower case extension without the dot, or "" when there is none. */
export function extensionOf(name: string): string {
  const base = cleanName(name);
  const i = base.lastIndexOf(".");
  return i > 0 && i < base.length - 1 ? base.slice(i + 1).toLowerCase() : "";
}

/** True when both the extension and the declared MIME type are on the allow list. */
export function isAllowedType(name: string, mime: string): boolean {
  const rule = ALLOWED[extensionOf(name)];
  if (!rule) return false;
  const m = String(mime).trim().toLowerCase();
  return typeof rule === "string" ? m === rule : rule.test(m);
}

/** A name safe for a storage path: no separators or control characters, only letters digits . _ - and spaces. */
export function safeName(name: string): string {
  const base = cleanName(name);
  const ext = extensionOf(base);
  let stem = ext ? base.slice(0, base.length - ext.length - 1) : base;
  stem = stem.replace(/[^A-Za-z0-9._ -]/g, "_").replace(/^\.+/, "_").trim().slice(0, 100);
  if (!stem) stem = "file";
  const safeExt = ext.replace(/[^a-z0-9]/g, "_").slice(0, 10);
  return safeExt ? stem + "." + safeExt : stem;
}

export function buildPath(location: string, jobId: string, fileId: string, name: string): string {
  return location + "/" + jobId + "/" + fileId + "-" + safeName(name);
}

/** True only when the path sits inside the location's folder (no dot segments, no backslashes). */
export function isUnderLocation(path: string, location: string): boolean {
  if (!location || typeof path !== "string") return false;
  if (!path.startsWith(location + "/")) return false;
  if (path.includes("\\")) return false;
  return !path.split("/").some((s) => s === ".." || s === ".");
}

/** 24 random hex characters. */
export function newFileId(): string {
  const b = new Uint8Array(12);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
