// Site photos: the rules for the extra details a photo row carries (purpose, label, caption, who and when, size, optional place).
// A photo is an ordinary job file (kind "Photo") plus a `photo` object on its row. Pure functions, no storage here.

export const PHOTO_PURPOSES = ["inspection", "before", "during", "after", "damage", "materials", "other"] as const;
export type PhotoPurpose = (typeof PHOTO_PURPOSES)[number];
export const PHOTO_SUBS = ["Roof", "Wall", "Ceiling", "Subfloor", "Other"] as const;

export interface PhotoMeta {
  purpose: PhotoPurpose;
  /** Roof, Wall, Ceiling, Subfloor or Other. "" when none. */
  sub: string;
  caption: string;
  /** ISO time the photo was taken (the phone's clock). */
  takenAt: string;
  /** Who took it (a name). */
  takenBy: string;
  width: number;
  height: number;
  /** Shown on the quote (Inspection photos only matter here). */
  onQuote: boolean;
  /** Only when the person allowed their location. */
  geo?: { lat: number; lng: number; acc: number };
}

const isRec = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const text = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(CONTROL, "").trim().slice(0, max) : "");

/** A purpose id, or undefined. */
export function purposeOf(v: unknown): PhotoPurpose | undefined {
  return PHOTO_PURPOSES.find((p) => p === v);
}

/** The caption/label fields a person may change later. Returns undefined when the input is not usable. */
export function cleanPhotoEdit(v: unknown): { purpose?: PhotoPurpose; sub?: string; caption?: string; onQuote?: boolean } | undefined {
  if (!isRec(v)) return undefined;
  const out: { purpose?: PhotoPurpose; sub?: string; caption?: string; onQuote?: boolean } = {};
  if (v.purpose !== undefined) {
    const p = purposeOf(v.purpose);
    if (!p) return undefined;
    out.purpose = p;
  }
  if (v.sub !== undefined) {
    const s = text(v.sub, 20);
    if (s && !PHOTO_SUBS.includes(s as (typeof PHOTO_SUBS)[number])) return undefined;
    out.sub = s;
  }
  if (v.caption !== undefined) out.caption = text(v.caption, 500);
  if (v.onQuote !== undefined) {
    if (typeof v.onQuote !== "boolean") return undefined;
    out.onQuote = v.onQuote;
  }
  return out;
}

/** The full details sent with a new photo. Returns undefined when they are not valid. */
export function cleanPhotoMeta(v: unknown): PhotoMeta | undefined {
  if (!isRec(v)) return undefined;
  const purpose = purposeOf(v.purpose);
  if (!purpose) return undefined;
  const edit = cleanPhotoEdit({ purpose, sub: v.sub ?? "", caption: v.caption ?? "", onQuote: v.onQuote ?? false });
  if (!edit) return undefined;
  const takenAt = typeof v.takenAt === "string" && !Number.isNaN(Date.parse(v.takenAt)) ? new Date(v.takenAt).toISOString() : new Date().toISOString();
  const dim = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 20000 ? Math.round(n) : 0);
  const meta: PhotoMeta = {
    purpose,
    sub: edit.sub ?? "",
    caption: edit.caption ?? "",
    takenAt,
    takenBy: text(v.takenBy, 80),
    width: dim(v.width),
    height: dim(v.height),
    onQuote: edit.onQuote === true,
  };
  if (isRec(v.geo)) {
    const { lat, lng, acc } = v.geo as Record<string, unknown>;
    if (typeof lat === "number" && typeof lng === "number" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      meta.geo = { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, acc: typeof acc === "number" && Number.isFinite(acc) ? Math.round(acc) : 0 };
    }
  }
  return meta;
}
