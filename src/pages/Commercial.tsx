import Seo from '@/components/ui/Seo'
import { PageCta, PageHero, Prose } from '@/components/PageParts'
import HeroObject3D from '@/components/HeroObject3D'
import SectorCards from '@/components/SectorCards'
import ClientLogos from '@/components/ClientLogos'
import WorkVideos from '@/components/WorkVideos'
import MidCta from '@/components/MidCta'
import FAQ from '@/components/FAQ'
import { commercialPage } from '@/data/pages'
import { faqSets } from '@/data/faqs'

const workIntro = {
  eyebrow: 'Commercial work',
  headingLines: ['Sheds, stores', 'and structures.'],
  accentWord: 'structures',
  lede: 'Industrial spans, controlled-temperature storage and shapes conventional insulation cannot follow.',
}

/**
 * Commercial and industrial.
 *
 * The page that has to fix the "reads as residential-only" problem. Scale
 * numbers come first, then real buildings, then the client list, which is the
 * strongest single asset we have: a facility manager who sees Coles, BHP and
 * Woodside stops wondering whether we are big enough.
 */
export default function Commercial() {
  return (
    <>
      <Seo
        title={commercialPage.seoTitle}
        description={commercialPage.seoDescription}
        path="/commercial"
      />
      <PageHero
        page={commercialPage}
        crumb="Commercial"
        aside={<HeroObject3D kind="warehouse" className="mx-auto aspect-square w-full max-w-[26rem]" />}
      />

      <Prose page={commercialPage} id="scale" />
      <SectorCards />

      <ClientLogos />
      <MidCta
        heading="Have a building like these?"
        text="Send us the drawings or the address and we will come back with a specification and a price."
      />

      <WorkVideos sector="commercial" intro={workIntro} tone="surface" />

      <Prose page={commercialPage} id="specify" />

      <FAQ set={faqSets.commercial} />

      <PageCta />
    </>
  )
}
