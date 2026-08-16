import { useEffect, useRef } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ReactLenis, useLenis, type LenisRef } from 'lenis/react'

// Registers GSAP plugins exactly once, before any component builds a timeline.
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'

import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import About from '@/pages/About'
import SprayFoam from '@/pages/SprayFoam'
import Residential from '@/pages/Residential'
import Commercial from '@/pages/Commercial'
import Contact from '@/pages/Contact'
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

  return (
    <HelmetProvider>
      <BrowserRouter>
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
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/spray-foam" element={<SprayFoam />} />
              <Route path="/residential" element={<Residential />} />
              <Route path="/commercial" element={<Commercial />} />
              <Route path="/contact" element={<Contact />} />

              {/* Internal hero comparison pages. Both are noindex. */}
              <Route path="/heroes" element={<HeroesIndexPage />} />
              <Route path="/heroes/:id" element={<HeroPreviewPage />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ReactLenis>
      </BrowserRouter>
    </HelmetProvider>
  )
}
