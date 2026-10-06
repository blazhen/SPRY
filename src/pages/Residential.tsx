import { lazy, Suspense } from 'react'
import Seo from '@/components/ui/Seo'
import { PageCta, PageHero, Prose } from '@/components/PageParts'
import HouseSurfaces from '@/components/HouseSurfaces'
import WorkVideos from '@/components/WorkVideos'
import StatBand from '@/components/StatBand'
import MidCta from '@/components/MidCta'
import FAQ from '@/components/FAQ'
import { residentialCta, residentialPage } from '@/data/pages'
import { faqSets } from '@/data/faqs'
import { routes } from '@/data/routes'

const Testimonials = lazy(() => import('@/components/Testimonials'))

const workIntro = {
  eyebrow: 'Residential work',
  headingLines: ['Homes we have', 'already sealed.'],
  accentWord: 'already',
  lede: 'Filmed on site during real jobs. Walls, roof lines and the subfloor almost nobody insulates.',
}

/**
 * Residential.
 *
 * The copy and its heading order are the SEO agency's residential outline:
 * the H1, the retrofit section, the three services, why insulate, how we
 * assess, why choose us, the closing call to action and then the questions.
 * The interactive house, the numbers, the videos and the reviews sit between
 * those sections rather than replacing any of them, so the outline reads
 * top to bottom exactly as written.
 *
 * The hero is a photograph of a technician spraying a home, which is what the
 * agency asked for in place of the 3D house.
 */
export default function Residential() {
  return (
    <>
      <Seo title={residentialPage.seoTitle} description={residentialPage.seoDescription} path={routes.residential} />
      <PageHero page={residentialPage} crumb="Residential" />

      <Prose page={residentialPage} id="intro" />
      <Prose page={residentialPage} id="retrofit" />
      <Prose page={residentialPage} id="services" />
      <HouseSurfaces />

      <Prose page={residentialPage} id="why-insulate" />
      <StatBand />
      <Prose page={residentialPage} id="assessment" />

      <WorkVideos sector="residential" intro={workIntro} />
      <MidCta heading="Sound like your house?" />

      <Suspense fallback={<div className="min-h-[50vh] bg-surface" aria-hidden="true" />}>
        <Testimonials />
      </Suspense>

      <Prose page={residentialPage} id="why-us" />
      <PageCta heading={residentialCta.heading} text={residentialCta.text} />
      <FAQ set={faqSets.residential} />
    </>
  )
}
