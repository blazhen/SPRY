import { gate } from "../lib/auth.js";
import { getConfig } from "../lib/env.js";
import {
  MAX_BYTES,
  MAX_FILES_PER_JOB,
  buildPath,
  cleanName,
  getFileStorage,
  isAllowedType,
  isUnderLocation,
  newFileId,
  type FileStorage,
} from "../lib/files.js";
import { jsonError, jsonOk, readJsonCapped } from "../lib/http.js";
import { cleanPhotoEdit, cleanPhotoMeta, type PhotoMeta } from "../lib/photos.js";
import { getStore, type HubStore } from "../store/index.js";

const COLLECTION = "attachments";
const JOB_ID = /^[A-Za-z0-9_-]{1,64}$/;
const FILE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const KINDS = ["Plan", "Energy report", "Photo", "Certificate", "Other"];
const MAX_BODY = 16 * 1024;
const UPLOAD_EXPIRES = 600;
const DOWNLOAD_EXPIRES = 300;
const PENDING_FRESH_MS = 60 * 60 * 1000;

type Row = {
  id: string;
  jobId: string;
  source: "file" | "link";
  name: string;
  kind: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  path: string;
  url?: string;
  status: "pending" | "ready";
  /** Site photos only: purpose, label, caption, who and when. */
  photo?: PhotoMeta;
};
type Ctx = { store: HubStore; files: FileStorage; location: string };

async function prepare(request: Request): Promise<Response | Ctx> {
  const denied = await gate(request);
  if (denied) return denied;
  const store = await getStore();
  const files = await getFileStorage();
  if (!store || !files) return jsonError(503, "File storage not configured");
  return { store, files, location: getConfig().locationId };
}

async function safe(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch {
    return jsonError(503, "Storage unavailable");
  }
}

async function rows(store: HubStore): Promise<Row[]> {
  return (await store.list(COLLECTION)).map((r) => r.data as Row);
}

async function load(store: HubStore, id: string): Promise<Row | null> {
  if (!FILE_ID.test(id)) return null;
  const rec = await store.get(COLLECTION, id);
  return rec ? (rec.data as Row) : null;
}

function kindOf(v: unknown): string {
  return typeof v === "string" && KINDS.includes(v) ? v : "Other";
}

// Rows count toward the cap when ready, or pending for less than an hour.
async function countForJob(store: HubStore, jobId: string): Promise<number> {
  const cutoff = Date.now() - PENDING_FRESH_MS;
  return (await rows(store)).filter(
    (r) =>
      r.jobId === jobId &&
      (r.status === "ready" || (r.status === "pending" && Date.parse(r.uploadedAt) > cutoff)),
  ).length;
}

function baseRow(b: Record<string, unknown>, name: string): Omit<Row, "source" | "size" | "type" | "path" | "status"> | null {
  const jobId = String(b.jobId ?? "");
  if (!JOB_ID.test(jobId)) return null;
  const by = b.uploadedBy === undefined ? "" : b.uploadedBy;
  if (typeof by !== "string" || by.length > 80) return null;
  return { id: newFileId(), jobId, name, kind: kindOf(b.kind), uploadedBy: by, uploadedAt: new Date().toISOString() };
}

// GET /api/files?jobId= : ready files and links of a job, newest first.
// GET /api/files?id=&download=1 : a short-lived download link for one stored file.
export async function GET(request: Request): Promise<Response> {
  const p = await prepare(request);
  if (p instanceof Response) return p;
  return safe(async () => {
    const q = new URL(request.url).searchParams;
    if (q.get("download")) {
      const row = await load(p.store, q.get("id") ?? "");
      if (!row || row.status !== "ready") return jsonError(404, "Not found");
      if (row.source !== "file") return jsonError(400, "Not a stored file");
      if (!isUnderLocation(row.path, p.location)) return jsonError(404, "Not found");
      // inline=1: no download name, so the browser may show a PDF or image in a tab. Otherwise the link forces a download.
      const url = await p.files.createSignedDownloadUrl(
        row.path,
        DOWNLOAD_EXPIRES,
        q.get("inline") === "1" ? undefined : row.name,
      );
      return jsonOk({ url, name: row.name, expiresIn: DOWNLOAD_EXPIRES });
    }
    const jobId = q.get("jobId") ?? "";
    if (!JOB_ID.test(jobId)) return jsonError(400, "Bad jobId");
    const files = (await rows(p.store))
      .filter((r) => r.jobId === jobId && r.status === "ready")
      .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : a.uploadedAt > b.uploadedAt ? -1 : 0));
    return jsonOk({ files });
  });
}

// POST /api/files {op: upload | confirm | link | rename, ...}
export async function POST(request: Request): Promise<Response> {
  const p = await prepare(request);
  if (p instanceof Response) return p;
  const read = await readJsonCapped(request, MAX_BODY);
  if (!read.ok) return jsonError(read.status, read.error);
  const b = read.value;
  return safe(async () => {
    if (b.op === "upload") {
      if (typeof b.name !== "string") return jsonError(400, "Bad name");
      const name = cleanName(b.name);
      if (!name || name.length > 200 || b.name.length > 400) return jsonError(400, "Bad name");
      if (!isAllowedType(name, typeof b.type === "string" ? b.type : ""))
        return jsonError(400, "File type not allowed");
      const size = b.size;
      if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > MAX_BYTES)
        return jsonError(413, "File too big (25 MB limit)");
      const base = baseRow(b, name);
      if (!base) return jsonError(400, "Bad request");
      let photo: PhotoMeta | undefined;
      if (b.photo !== undefined) {
        photo = cleanPhotoMeta(b.photo);
        if (!photo || !String(b.type).toLowerCase().startsWith("image/")) return jsonError(400, "Bad photo details");
      }
      if ((await countForJob(p.store, base.jobId)) >= MAX_FILES_PER_JOB)
        return jsonError(409, "Too many files on this job (50 limit)");
      const row: Row = {
        ...base,
        ...(photo ? { photo } : {}),
        source: "file",
        size,
        type: String(b.type).trim().toLowerCase(),
        path: buildPath(p.location, base.jobId, base.id, name),
        status: "pending",
      };
      const up = await p.files.createSignedUploadUrl(row.path, UPLOAD_EXPIRES);
      await p.store.put(COLLECTION, row.id, row);
      return jsonOk({ file: row, uploadUrl: up.url, uploadHeaders: up.headers, expiresIn: UPLOAD_EXPIRES });
    }
    if (b.op === "confirm") {
      const row = await load(p.store, String(b.id ?? ""));
      if (!row || row.source !== "file" || !isUnderLocation(row.path, p.location))
        return jsonError(404, "Not found");
      if (row.status === "ready") return jsonOk({ file: row });
      const head = await p.files.head(row.path);
      if (!head) return jsonError(409, "Upload not found");
      if (head.size > MAX_BYTES) {
        await p.files.remove(row.path);
        await p.store.delete(COLLECTION, row.id);
        return jsonError(413, "File too big (25 MB limit)");
      }
      const next: Row = { ...row, size: head.size, status: "ready" };
      await p.store.put(COLLECTION, next.id, next);
      return jsonOk({ file: next });
    }
    if (b.op === "link") {
      if (typeof b.name !== "string") return jsonError(400, "Bad name");
      const name = cleanName(b.name);
      if (!name || name.length > 200) return jsonError(400, "Bad name");
      let url: URL;
      try {
        url = new URL(String(b.url ?? ""));
      } catch {
        return jsonError(400, "Bad link");
      }
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.href.length > 2000)
        return jsonError(400, "Bad link");
      const base = baseRow(b, name);
      if (!base) return jsonError(400, "Bad request");
      if ((await countForJob(p.store, base.jobId)) >= MAX_FILES_PER_JOB)
        return jsonError(409, "Too many files on this job (50 limit)");
      const row: Row = { ...base, source: "link", size: 0, type: "link", path: "", url: url.href, status: "ready" };
      await p.store.put(COLLECTION, row.id, row);
      return jsonOk({ file: row });
    }
    if (b.op === "rename") {
      const row = await load(p.store, String(b.id ?? ""));
      if (!row) return jsonError(404, "Not found");
      const name = typeof b.name === "string" ? cleanName(b.name) : "";
      if (!name || name.length > 200) return jsonError(400, "Bad name");
      const next: Row = { ...row, name };
      await p.store.put(COLLECTION, next.id, next);
      return jsonOk({ file: next });
    }
    if (b.op === "photo") {
      // Change the label, caption, purpose or quote flag of one photo.
      const row = await load(p.store, String(b.id ?? ""));
      if (!row || !row.photo) return jsonError(404, "Not found");
      const edit = cleanPhotoEdit(b.edit);
      if (!edit) return jsonError(400, "Bad photo details");
      // A photo that is no longer an Inspection photo cannot stay on the customer's quote.
      const photo = { ...row.photo, ...edit };
      if (photo.purpose !== "inspection") photo.onQuote = false;
      const next: Row = { ...row, photo };
      await p.store.put(COLLECTION, next.id, next);
      return jsonOk({ file: next });
    }
    return jsonError(400, "Bad op");
  });
}

// DELETE /api/files?id= : removes the stored object (files only), then the row.
export async function DELETE(request: Request): Promise<Response> {
  const p = await prepare(request);
  if (p instanceof Response) return p;
  return safe(async () => {
    const row = await load(p.store, new URL(request.url).searchParams.get("id") ?? "");
    if (!row) return jsonError(404, "Not found");
    if (row.source === "file") {
      if (!isUnderLocation(row.path, p.location)) return jsonError(404, "Not found");
      await p.files.remove(row.path);
    }
    await p.store.delete(COLLECTION, row.id);
    return jsonOk({ ok: true });
  });
}
