import { ScrollTrigger } from '@/lib/gsap'

declare global {
  interface Window {
    /** Installed by the boot screen controller in index.html. */
    __bootReady?: () => void
  }
}

/**
 * Longest the boot screen will wait on webfonts.
 *
 * Fonts are requested from a third-party CDN, so `document.fonts.ready` is not
 * guaranteed to settle promptly. Headings are set in a display face with quite
 * different metrics from the fallback, so revealing before the swap means a
 * visible reflow, and reflowing after ScrollTrigger has measured its pins means
 * the pins are measured against the wrong heights. Worth a short wait, not an
 * unbounded one.
 */
const FONT_WAIT_MS = 2500

function waitForFonts(): Promise<void> {
  const fonts = document.fonts
  if (!fonts?.ready) return Promise.resolve()
  return Promise.race([
    fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]).catch(() => undefined)
}

/**
 * Tell the boot screen the app is up, then dismiss it.
 *
 * Two frames are allowed to pass after mount so React has committed and the
 * first paint of real content has landed, otherwise the panel can wipe away
 * from an empty page.
 *
 * The panel locks scrolling on the document while it is up, so any pin created
 * during mount was measured against a scroller that could not scroll.
 * Everything is re-measured once the lock is released.
 */
export function signalAppReady(): void {
  const reveal = () => {
    window.__bootReady?.()
    // After the lock is released and the layout has settled.
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }

  void waitForFonts().then(() => {
    requestAnimationFrame(() => requestAnimationFrame(reveal))
  })
}
