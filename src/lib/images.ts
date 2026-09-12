/**
 * Image helpers.
 *
 * All photography is served from the Unsplash CDN with `auto=format` so modern
 * browsers get AVIF/WebP automatically. Every ID used in `src/data` has been
 * verified to resolve; `<Figure>` still renders a branded fallback if a request
 * fails, so a dead URL degrades gracefully instead of leaving a broken image.
 */

/** Build a single Unsplash CDN URL at a given width. */
export const unsplash = (id: string, w = 1600, q = 72): string =>
  // A leading slash means a real photograph in public/, not a stock ID. Client
  // work replacing stock is the whole direction of travel here, so the helper
  // has to accept both rather than forcing a second code path at every call.
  id.startsWith('/')
    ? id
    : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`

/** Responsive srcSet across the widths we actually render at. */
export const unsplashSrcSet = (id: string, widths: number[] = [640, 960, 1280, 1920]): string =>
  // One local file cannot be served at four widths, so it gets no srcSet at
  // all rather than the same URL repeated with four different descriptors.
  id.startsWith('/') ? '' : widths.map((w) => `${unsplash(id, w)} ${w}w`).join(', ')

/** A photograph plus the alt text that must always travel with it. */
export interface ImageAsset {
  /** Unsplash photo ID, e.g. `photo-1568605114967-8130f3a36994`. */
  id: string
  /** Meaningful alt text. Describes content and purpose, never "image of". */
  alt: string
  /** Set when this is stock standing in for real client work. */
  clientSwap?: boolean
}
