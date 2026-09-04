import { useEffect } from 'react'
import type { EmblaCarouselType } from 'embla-carousel'

/**
 * Trackpad support for an Embla carousel.
 *
 * Embla handles drag and swipe out of the box, but a two-finger horizontal
 * trackpad gesture is a wheel event carrying `deltaX`, and nothing was
 * listening for it. On a laptop that made every slider on the site look stuck:
 * the gesture a visitor naturally reaches for did nothing at all, and the only
 * way across was a pair of small arrows below the frame. Glenn reported exactly
 * that, twice, on two different sliders.
 *
 * Only horizontal intent is intercepted. While `|deltaX| <= |deltaY|` the event
 * is left completely alone, so scrolling down the page with the pointer over a
 * carousel still scrolls the page. Hijacking vertical wheel here would trap the
 * reader inside the slider, which is a far worse bug than the one being fixed.
 *
 * The listener is deliberately non-passive, because it calls `preventDefault`
 * to stop the browser turning a horizontal gesture into a back-navigation.
 */
export function useCarouselWheel(api: EmblaCarouselType | undefined): void {
  useEffect(() => {
    if (!api) return
    const node = api.rootNode()
    if (!node) return

    /** Accumulated horizontal travel since the last step. */
    let travel = 0
    /** When the last step fired, so one flick moves one slide. */
    let lastStep = 0

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()

      const now = performance.now()
      // A trackpad flick emits a long tail of decaying events. Without this
      // window a single gesture would run through four or five slides.
      if (now - lastStep < 280) return

      travel += event.deltaX
      if (Math.abs(travel) < 26) return

      if (travel > 0) api.scrollNext()
      else api.scrollPrev()

      travel = 0
      lastStep = now
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [api])
}
