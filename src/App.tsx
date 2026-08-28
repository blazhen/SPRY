import { useEffect, useRef } from 'react'
import { BrowserRouter, HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ReactLenis, useLenis, type LenisRef } from 'lenis/react'

// Registers GSAP plugins exactly once, before any component builds a timeline.
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { captureAttribution } from '@/lib/attribution'
import { startAnalytics, trackPageView } from '@/lib/analytics'
import { integrations } from '@/config/integrations'

import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import About from '@/pages/About'
import SprayFoam from '@/pages/SprayFoam'
import Residential from '@/pages/Residential'
import Commercial from '@/pages/Commercial'
import Contact from '@/pages/Contact'
import Book from '@/pages/Book'
import ThankYou from '@/pages/ThankYou'
import Privacy from '@/pages/Privacy'
import NotFound from '@/pages/NotFound'
import { HeroesIndexPage, HeroPreviewPage } from '@/pages/HeroPreview'

/**
 * Keeps ScrollTrigger's cached positions in sync with Lenis' virtual scroll.
 * Must live inside <ReactLenis> so the context is available.
 */
function LenisScrollTriggerSync() {
  useLenis(() => ScrollTrigger.update())
  return null
}

/**
 * On route change: jump to the top instantly and recalculate every trigger,
 * since the new page has entirely different section heights.
 */
function RouteScrollReset() {
  const { pathname } = useLocation()
  const lenis = useLenis()

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true })
    window.scrollTo(0, 0)
    // Let the new route paint before measuring.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [pathname, lenis])

  return null
}

/**
 * Measurement and attribution.
 *
 * Attribution is captured on every route change, not just first load, because
 * an ad can land someone on any page. The capture itself only ever writes the
 * first touch once, so repeat calls are harmless.
 *
 * GA4's automatic page_view only fires on the initial document load, so a
 * single page app has to report subsequent routes itself.
 */
function RouteAnalytics() {
  const { pathname, search } = useLocation()
  const started = useRef(false)

  useEffect(() => {
    captureAttribution()
    if (!started.current) {
      started.current = true
      startAnalytics()
      // The first page_view is emitted by the gtag config call.
      return
    }
    trackPageView(pathname + search)
  }, [pathname, search])

  return null
}

export default function App() {
  const lenisRef = useRef<LenisRef>(null)
  const reducedMotion = useReducedMotion()

  // Drive Lenis from GSAP's ticker rather than its own RAF loop. One loop, one
  // frame ordering. This is what keeps scrub animations from jittering.
  useEffect(() => {
    const update = (time: number) => {
      // gsap.ticker reports seconds; Lenis wants milliseconds.
      lenisRef.current?.lenis?.raf(time * 1000)
    }
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(update)
    }
  }, [])

  /**
   * Clean URLs need the host to serve index.html for unknown paths. Not every
   * static host does, and a 404 on /contact would take the whole funnel down,
   * so the router is switchable from the runtime config block in index.html.
   * Hash routing needs nothing from the server and works anywhere.
   */
  const Router = integrations.router === 'hash' ? HashRouter : BrowserRouter

  return (
    <HelmetProvider>
      <Router>
        <ReactLenis
          root
          options={{
            autoRaf: false, // GSAP's ticker drives it. See the effect above.
            duration: 1.1,
            lerp: 0.1,
            // Under prefers-reduced-motion, hand scrolling back to the browser.
            smoothWheel: !reducedMotion,
            syncTouch: false,
            touchMultiplier: 1.6,
          }}
          ref={lenisRef}
        >
          <LenisScrollTriggerSync />
          <RouteScrollReset />
          <RouteAnalytics />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/spray-foam" element={<SprayFoam />} />
              <Route path="/residential" element={<Residential />} />
              <Route path="/commercial" element={<Commercial />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/book" element={<Book />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Confirmation pages. Distinct URLs so a conversion is only
                  counted once someone actually lands here. Both noindex. */}
              <Route path="/thanks/:kind" element={<ThankYou />} />

              {/* Internal hero comparison pages. Both are noindex. */}
              <Route path="/heroes" element={<HeroesIndexPage />} />
              <Route path="/heroes/:id" element={<HeroPreviewPage />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ReactLenis>
      </Router>
    </HelmetProvider>
  )
}
