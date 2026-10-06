import { useEffect, useRef } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
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
import Gallery from '@/pages/Gallery'
import Blog from '@/pages/Blog'
import BlogPost from '@/pages/BlogPost'
import NotFound from '@/pages/NotFound'
import ServicePage from '@/pages/ServicePage'
import { HeroesIndexPage, HeroPreviewPage } from '@/pages/HeroPreview'
import { legacyRedirects, postPath, routes } from '@/data/routes'

/** Route patterns take the address without its trailing slash; both forms match. */
const at = (path: string) => (path === '/' ? '/' : path.replace(/\/$/, ''))

/** An article's old staging address, /blog/<slug>, now lives at /<slug>/. */
function OldPostAddress() {
  const { slug = '' } = useParams()
  return <Navigate to={postPath(slug)} replace />
}

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
 * Scrolls to `#section` links.
 *
 * A browser only honours a hash on a full page load. With client-side routing
 * the address changes without one, so a link to /residential#roof would land
 * at the top of the page and stay there. The target may also mount a beat
 * after the route does, so this looks for it a few times before giving up.
 */
function HashScroll() {
  const { pathname, hash } = useLocation()
  const lenis = useLenis()

  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    let attempts = 0
    let timer = 0

    const go = () => {
      const target = document.getElementById(id)
      if (!target) {
        if (attempts++ < 12) timer = window.setTimeout(go, 120)
        return
      }
      const header = document.querySelector('[data-site-header]')?.getBoundingClientRect().height ?? 96
      const top = target.getBoundingClientRect().top + window.scrollY - header - 16
      if (lenis) lenis.scrollTo(top, { immediate: true })
      window.scrollTo(0, top)
      ScrollTrigger.refresh()
    }

    timer = window.setTimeout(go, 80)
    return () => window.clearTimeout(timer)
  }, [pathname, hash, lenis])

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
          <HashScroll />
          <RouteAnalytics />
          <Routes>
            <Route element={<Layout />}>
              <Route path={at(routes.home)} element={<Home />} />
              <Route path={at(routes.about)} element={<About />} />
              <Route path={at(routes.sprayFoam)} element={<SprayFoam />} />
              <Route path={at(routes.residential)} element={<Residential />} />
              <Route path={at(routes.underfloor)} element={<ServicePage id="underfloor" />} />
              <Route path={at(routes.roofCeiling)} element={<ServicePage id="roof" />} />
              <Route path={at(routes.walls)} element={<ServicePage id="walls" />} />
              <Route path={at(routes.commercial)} element={<Commercial />} />
              <Route path={at(routes.contact)} element={<Contact />} />
              <Route path={at(routes.book)} element={<Book />} />
              <Route path={at(routes.gallery)} element={<Gallery />} />
              <Route path={at(routes.blog)} element={<Blog />} />
              <Route path={at(routes.privacy)} element={<Privacy />} />

              {/* Articles sit at the root, as they did on the old site. Any
                  other single-segment address lands here too and BlogPost
                  shows the not-found page for it. */}
              <Route path="/:slug" element={<BlogPost />} />
              <Route path="/blog/:slug" element={<OldPostAddress />} />

              {/* Old addresses. The host's redirect file carries the same
                  list; this is the fallback for a host that ignores it. */}
              {legacyRedirects.map(([from, to]) => (
                <Route key={from} path={from.replace(/\*$/, '*')} element={<Navigate to={to} replace />} />
              ))}

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
