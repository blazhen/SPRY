import { lazy, Suspense } from 'react'
import Seo from '@/components/ui/Seo'
import { PageCta, PageHero, Prose } from '@/components/PageParts'
import HeroObject3D from '@/components/HeroObject3D'
import HouseSurfaces from '@/components/HouseSurfaces'
import WorkVideos from '@/components/WorkVideos'
import { residentialPage } from '@/data/pages'

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
 * Leads with the interactive house, because "three surfaces, seal all three"
 * is a spatial argument and reads far better as a diagram than as prose. The
 * testimonials sit near the end where the reader is deciding rather than
 * learning.
 */
export default function Residential() {
  return (
    <>
      <Seo
        title={residentialPage.seoTitle}
        description={residentialPage.seoDescription}
        path="/residential"
      />
      <PageHero
        page={residentialPage}
        aside={<HeroObject3D kind="house" className="mx-auto aspect-square w-full max-w-[26rem]" />}
      />

      <HouseSurfaces />
      <Prose page={residentialPage} id="retrofit" />

      <WorkVideos sector="residential" intro={workIntro} />

      <Prose page={residentialPage} id="outcome" />

      <Suspense fallback={<div className="min-h-[50vh] bg-bone" aria-hidden="true" />}>
        <Testimonials />
      </Suspense>

      <PageCta />
    </>
  )
}
