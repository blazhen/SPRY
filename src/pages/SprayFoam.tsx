import Seo from '@/components/ui/Seo'
import { PageCta, PageHero, Prose } from '@/components/PageParts'
import FoamComparison from '@/components/FoamComparison'
import HeroObject3D from '@/components/HeroObject3D'
import InsulationScene from '@/components/InsulationScene'
import RValueExplainer from '@/components/RValueExplainer'
import MidCta from '@/components/MidCta'
import FAQ from '@/components/FAQ'
import { sprayFoamPage } from '@/data/pages'
import { faqSets } from '@/data/faqs'

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
        path="/spray-foam"
      />
      {/* The other two pages open on the building they serve. This one opens
          on the material itself, cycling between the two foams, which is the
          argument the whole page then unpacks. */}
      <PageHero
        page={sprayFoamPage}
        crumb="Spray Foam"
        aside={<HeroObject3D kind="foam" className="mx-auto aspect-square w-full max-w-[26rem]" />}
      />

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
