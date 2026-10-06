import Seo from '@/components/ui/Seo'
import { PageCta, PageHero, Prose } from '@/components/PageParts'
import SectorCards from '@/components/SectorCards'
import ClientLogos from '@/components/ClientLogos'
import WorkVideos from '@/components/WorkVideos'
import MidCta from '@/components/MidCta'
import FAQ from '@/components/FAQ'
import { commercialPage } from '@/data/pages'
import { faqSets } from '@/data/faqs'
import { routes } from '@/data/routes'

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
        path={routes.commercial}
      />
      {/* A real commercial job on the tools, rather than the 3D warehouse:
          the SEO agency asked for real work in the hero. */}
      <PageHero page={commercialPage} crumb="Commercial" />

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
