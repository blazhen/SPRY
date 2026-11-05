// Photos the customer may see on the quote page: only Inspection photos staff marked "On the quote", only for the quote's own job,
// each as a short-lived signed picture address. Nothing else about the photo leaves the server: no place, no who, no file name, no path.
import { getConfig } from "./env.js";
import { getFileStorage, isUnderLocation } from "./files.js";
import type { PhotoMeta } from "./photos.js";
import type { HubStore } from "../store/index.js";

export interface PublicPhoto {
  id: string;
  caption: string;
  sub: string;
  url: string;
}

const MAX_PUBLIC_PHOTOS = 12;
const PUBLIC_EXPIRES = 1800;

type Row = { id: string; jobId: string; source: string; status: string; path: string; uploadedAt: string; photo?: PhotoMeta };

/** True when a photo row may be shown to the customer. */
export function isCustomerPhoto(r: Row, jobId: string, location: string): boolean {
  return (
    r.jobId === jobId &&
    r.source === "file" &&
    r.status === "ready" &&
    !!r.photo &&
    r.photo.onQuote === true &&
    r.photo.purpose === "inspection" &&
    typeof r.path === "string" &&
    isUnderLocation(r.path, location)
  );
}

/** The photos for one quote's job. Never throws: any failure gives an empty list, so the quote page still works. */
export async function customerPhotos(store: HubStore, jobId: string): Promise<PublicPhoto[]> {
  try {
    if (typeof jobId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(jobId)) return [];
    const files = await getFileStorage();
    if (!files) return [];
    const location = getConfig().locationId;
    const rows = (await store.list("attachments")).map((r) => r.data as Row).filter((r) => r && isCustomerPhoto(r, jobId, location));
    rows.sort((a, b) => (a.photo?.takenAt ?? a.uploadedAt).localeCompare(b.photo?.takenAt ?? b.uploadedAt));
    const out: PublicPhoto[] = [];
    for (const r of rows.slice(0, MAX_PUBLIC_PHOTOS)) {
      out.push({ id: r.id, caption: r.photo?.caption ?? "", sub: r.photo?.sub ?? "", url: await files.createSignedDownloadUrl(r.path, PUBLIC_EXPIRES) });
    }
    return out;
  } catch {
    return [];
  }
}
