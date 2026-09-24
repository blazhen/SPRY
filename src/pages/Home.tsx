import { Suspense, lazy } from 'react'
import Seo from '@/components/ui/Seo'
import { ACTIVE_HERO } from '@/config'
import Hero from '@/components/Hero'
import HeroSeal from '@/components/HeroSeal'
import HeroComfort from '@/components/HeroComfort'
import HeroEditorial from '@/components/HeroEditorial'
import HeroFoam from '@/components/HeroFoam'
import HeroSpray from '@/components/HeroSpray'
import HeroHouse from '@/components/HeroHouse'
import Marquee from '@/components/Marquee'
import WhatIsSprayFoam from '@/components/WhatIsSprayFoam'
import Benefits from '@/components/Benefits'
import InsulationScene from '@/components/InsulationScene'
import Services from '@/components/Services'
import StatBand from '@/components/StatBand'
import WorkVideos from '@/components/WorkVideos'
import SectorTransition from '@/components/SectorTransition'
import RValueExplainer from '@/components/RValueExplainer'
import ClientLogos from '@/components/ClientLogos'
import FAQ from '@/components/FAQ'
import MidCta from '@/components/MidCta'
import QuoteCTA from '@/components/QuoteCTA'

// Embla ships as its own chunk, requested only when the page gets this far.
const Testimonials = lazy(() => import('@/components/Testimonials'))

export default function Home() {
  return (
    <>
      <Seo structuredData />

      {/* Swap which hero renders from ACTIVE_HERO in src/config.ts. */}
      {ACTIVE_HERO === 'house' && <HeroHouse />}
      {ACTIVE_HERO === 'spray' && <HeroSpray />}
      {ACTIVE_HERO === 'foam' && <HeroFoam />}
      {ACTIVE_HERO === 'editorial' && <HeroEditorial />}
      {ACTIVE_HERO === 'comfort' && <HeroComfort />}
      {ACTIVE_HERO === 'seal' && <HeroSeal />}
      {ACTIVE_HERO === 'thermal' && <Hero />}

      {/* The numbers come first: the trust signals a first-time visitor wants
          before anything else, straight under the hero. */}
      <StatBand />

      {/* The brief is that the site must not read as residential-only, so
          this is the first full section after the numbers. */}
      <SectorTransition />

      {/* Velocity-reactive strip that catches the hero's scroll hand-off.
          Sized as a strapline, not a headline: at display size the moving
          text competed with the content around it. */}
      <Marquee
        duration={40}
        className="border-y border-line/10 bg-ink py-5 sm:py-6"
        itemClassName="font-display text-[clamp(1.25rem,1.8vw,1.5rem)] font-semibold uppercase leading-none tracking-normal text-bone"
      />

      <WhatIsSprayFoam />
      <RValueExplainer />
      <Benefits />
      <InsulationScene />
      <Services />

      {/* Dark, so it breaks up the run of light sections through to the logo
          band. */}
      <WorkVideos />

      {/* After the proof, before the testimonials: one line and two buttons. */}
      <MidCta />

      <Suspense
        fallback={<div className="min-h-[60vh] bg-bone" aria-hidden="true" />}
      >
        <Testimonials />
      </Suspense>

      <ClientLogos />
      <FAQ />
      <QuoteCTA />
    </>
  )
}
