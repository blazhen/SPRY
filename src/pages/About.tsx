import { lazy, Suspense } from 'react'
import Seo from '@/components/ui/Seo'
import { PageCta, PageHero, Prose } from '@/components/PageParts'
import CapabilityGrid from '@/components/CapabilityGrid'
import ClientLogos from '@/components/ClientLogos'
import WorkVideos from '@/components/WorkVideos'
import { aboutPage } from '@/data/pages'
import { routes } from '@/data/routes'

const Testimonials = lazy(() => import('@/components/Testimonials'))

/* The video the Service Agreement puts in the About section: the crew on real
   jobs, homes and commercial both, straight after the story it backs up. */
const videoIntro = {
  eyebrow: 'On film',
  keyword: 'Spray Foam Insulation Videos',
  headingLines: ['The team,', 'on the tools.'],
  accentWord: 'tools',
  lede: 'Filmed on our own jobs, from a stud wall in a suburban house to a potato store and an inflated dome. No stock footage.',
}

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
      <Seo title={aboutPage.seoTitle} description={aboutPage.seoDescription} path={routes.about} />
      <PageHero page={aboutPage} crumb="About" />

      <Prose page={aboutPage} id="story" />
      <WorkVideos intro={videoIntro} tone="surface" />
      <CapabilityGrid />
      <Prose page={aboutPage} id="standards" />

      {/* Real brands carry more weight here than anything we could write. */}
      <ClientLogos />

      <Suspense fallback={<div className="min-h-[50vh] bg-surface" aria-hidden="true" />}>
        <Testimonials />
      </Suspense>

      <PageCta />
    </>
  )
}
