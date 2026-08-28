import { lazy, Suspense } from 'react'
import Seo from '@/components/ui/Seo'
import { PageCta, PageHero, Prose } from '@/components/PageParts'
import CapabilityGrid from '@/components/CapabilityGrid'
import ClientLogos from '@/components/ClientLogos'
import { aboutPage } from '@/data/pages'

const Testimonials = lazy(() => import('@/components/Testimonials'))

/**
 * About.
 *
 * The story is the smallest part of this page. What actually persuades is the
 * equipment count and the client list, so both sit above the prose about
 * standards rather than below it.
 */
export default function About() {
  return (
    <>
      <Seo title={aboutPage.seoTitle} description={aboutPage.seoDescription} path="/about" />
      <PageHero page={aboutPage} />

      <Prose page={aboutPage} id="story" />
      <CapabilityGrid />
      <Prose page={aboutPage} id="standards" />

      {/* Real brands carry more weight here than anything we could write. */}
      <ClientLogos />

      <Suspense fallback={<div className="min-h-[50vh] bg-bone" aria-hidden="true" />}>
        <Testimonials />
      </Suspense>

      <PageCta />
    </>
  )
}
