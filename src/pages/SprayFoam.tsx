import Seo from '@/components/ui/Seo'
import { PageCta, PageHero, Prose } from '@/components/PageParts'
import FoamComparison from '@/components/FoamComparison'
import InsulationScene from '@/components/InsulationScene'
import RValueExplainer from '@/components/RValueExplainer'
import MidCta from '@/components/MidCta'
import FAQ from '@/components/FAQ'
import { sprayFoamPage } from '@/data/pages'
import { faqSets } from '@/data/faqs'
import { routes } from '@/data/routes'

/**
 * Spray foam, the technical page.
 *
 * This is where someone lands who wants to be convinced, so it carries the
 * heaviest explanatory content on the site: the open versus closed comparison,
 * the interactive 3D wall, and the R-value argument. The FAQ closes it because
 * by that point the reader has specific questions, and they are this page's
 * own questions rather than the homepage's.
 */
export default function SprayFoam() {
  return (
    <>
      <Seo
        title={sprayFoamPage.seoTitle}
        description={sprayFoamPage.seoDescription}
        path={routes.sprayFoam}
      />
      {/* Foam going on, photographed on a job. The 3D wall further down is
          where the reader turns the material over and looks. */}
      <PageHero page={sprayFoamPage} crumb="What Is Spray Foam" />

      <Prose page={sprayFoamPage} id="how" />
      <FoamComparison />

      {/* The 3D wall belongs here more than on the homepage: this is the
          audience that wants to turn it over and look. */}
      <InsulationScene />
      <MidCta heading="Want it in your building?" />

      <Prose page={sprayFoamPage} id="air" />
      <RValueExplainer />
      <FAQ set={faqSets.sprayFoam} />

      <PageCta />
    </>
  )
}
