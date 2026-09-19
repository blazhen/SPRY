import type { SectionIntro } from '@/data/content'

/**
 * Completed work, photographed on site.
 *
 * These are the client's own job photographs, carried across from the photo
 * gallery on the site this one replaces. That page is one of the addresses
 * Google has indexed, so dropping it without a home would have thrown away both
 * the ranking and the only real proof-of-work imagery the business has.
 *
 * Every original was a 600KB to 1.7MB JPEG or PNG at 1200px. They are served
 * here as 1100px WebP, which took the set from 18MB to 2.2MB without a visible
 * difference at the size they are displayed.
 *
 * ON THE CAPTIONS. First written from thumbnails, then from the full-size
 * images, and now from Glenn's own answers in the photo notes document.
 * Every job, town, product and thickness below is his. Where he did not say,
 * the caption says only what the frame shows.
 *
 * Two naming rules held on purpose. SunRice is named because Glenn said so and
 * the job is already a published case study. Nobody else is, until they have
 * agreed: a homeowner in Benalla, the zoo and the film production are all
 * described, not named. A gallery is evidence, and naming someone who has not
 * agreed to it turns evidence into a liability.
 *
 * Four photographs came out at his request. He asked for one or two of the
 * film set and one or two of the zoo, so the wide set shot and the freezer
 * stay, one per film job, and the zoo keeps the finished foam and the building.
 * The files are still in public/gallery, unlisted, in case he wants one back.
 */

export interface GalleryShot {
  file: string
  alt: string
  caption: string
  sector: 'residential' | 'commercial'
}

const g = (file: string) => `/gallery/${file}`

export const galleryShots: GalleryShot[] = [
  /* ------------------------------------------------------ commercial ---- */
  {
    file: g('sunrice-roof-hero.webp'),
    alt: 'Completed white sprayed roof on the SunRice processing plant, with plant and silos beyond',
    caption: 'SunRice processing plant, Leeton NSW. 50mm roofing foam under an acrylic coat',
    sector: 'commercial',
  },
  {
    file: g('img-2351.webp'),
    alt: 'Sculpted rock face built from spray foam inside a film studio, with scaffolding and lighting rigs above',
    caption: 'Film set, carved from sprayed foam inside a Docklands studio',
    sector: 'commercial',
  },
  {
    file: g('img-1297.webp'),
    alt: 'Sprayed foam wall moulded to look like the inside of a freezer, with raised coil shapes',
    caption: 'A freezer for a film set that never kept anything cold. 50mm closed cell',
    sector: 'commercial',
  },
  {
    file: g('img-2371.webp'),
    alt: 'Large indoor basketball hall with sprayed walls and roof, marked floor and a basketball ring',
    caption: 'Basketball hall roof, Riddells Creek. 50mm closed cell',
    sector: 'commercial',
  },
  {
    file: g('img-2377.webp'),
    alt: 'Looking up at the sprayed roof deck of the basketball hall between steel portal frames',
    caption: 'The same hall, sprayed between the portal frames',
    sector: 'commercial',
  },
  {
    file: g('img-2710.webp'),
    alt: 'Interior of a steel-framed basketball hall with sprayed roof and upper walls',
    caption: 'Basketball hall, Woodend. 50mm of dyed closed cell',
    sector: 'commercial',
  },
  {
    file: g('img-2711.webp'),
    alt: 'Sprayed roof deck of the Woodend hall seen from below, running the full span between purlins',
    caption: 'Sprayed between the purlins across the full span',
    sector: 'commercial',
  },
  {
    file: g('img-0706.webp'),
    alt: 'Sprayed Bondek ceiling of a basement car park, above storage cages, copper pipework and cable tray',
    caption: 'Basement car park ceiling, Glen Iris apartments. 50mm closed cell to the Bondek',
    sector: 'commercial',
  },
  {
    file: g('img-1328.webp'),
    alt: 'Closed cell foam sprayed around the base of a round concrete water tank and its pipework, before backfilling',
    caption: 'Water tank pipework, sealed in 75mm closed cell before the backfill',
    sector: 'commercial',
  },
  {
    file: g('pc140546.webp'),
    alt: 'Applicator in full protective equipment spraying the wall of a chicken shed behind the drinker line',
    caption: 'Chicken shed, 50mm closed cell, sprayed by our own crew',
    sector: 'commercial',
  },
  {
    file: g('img-2873.webp'),
    alt: 'Underside of an animal enclosure roof, sprayed with open cell foam between the steel battens',
    caption: 'Animal enclosure roof, Melbourne. 200mm of Icynene LDC-50 open cell',
    sector: 'commercial',
  },
  {
    file: g('img-2872.webp'),
    alt: 'The enclosure building under construction, crew carrying a timber beam beneath the steel roof frame',
    caption: 'The same enclosure, mid build',
    sector: 'commercial',
  },

  /* ----------------------------------------------------- residential ---- */
  {
    file: g('img-1757.webp'),
    alt: 'Sprayed roof deck behind green painted steel trusses in a house',
    caption: 'House roof, Benalla. 200mm of Icynene LDC-50 open cell',
    sector: 'residential',
  },
  {
    file: g('img-0993-2.webp'),
    alt: 'Timber-framed room with foam filling every wall cavity, flush with the studs',
    caption: 'Closed cell in the walls, open cell under the roof, one house',
    sector: 'residential',
  },
  {
    file: g('img-2277.webp'),
    alt: 'Foam sprayed across a ceiling between exposed timber beams',
    caption: 'Ceiling, 100mm of closed cell',
    sector: 'residential',
  },
  {
    file: g('img-2419.webp'),
    alt: 'Curved roof sheeting lifted to reveal the old glasswool batts and sarking underneath',
    caption: 'Curved roof, Cremorne. One sheet off at a time, old batts out, 150mm open cell in',
    sector: 'residential',
  },
  {
    file: g('img-2792.webp'),
    alt: 'Subfloor space with brick piers and the underside of the floor sprayed above',
    caption: 'Underfloor, sprayed between the piers',
    sector: 'residential',
  },
]

export const galleryIntro: SectionIntro = {
  eyebrow: 'Photo gallery',
  headingLines: ['Work we have', 'actually done.'],
  accentWord: 'actually',
  lede: 'Photographed on our own jobs. A processing plant, two basketball halls, a basement car park, an animal enclosure, a chicken shed, two film sets, and the roofs, walls and floors of people\'s homes.',
}

/**
 * Technical documents.
 *
 * Carried across from the fact sheets page. Two of the client's own downloads,
 * the LD-C-50 and MD-R-200 safety data sheets, return 404 on their existing
 * site and so are not listed here. They are worth chasing: a safety data sheet
 * is the first document a commercial specifier asks for.
 */
export interface FactSheet {
  title: string
  note: string
  file: string
  kind: 'Test report' | 'Safety data sheet' | 'Product data' | 'Company'
}

export const factSheets: FactSheet[] = [
  {
    title: 'CSIRO noise deadening test',
    note: 'Independent Australian acoustic testing of sprayed polyurethane foam.',
    file: '/docs/csiro-noise-deadening-test.pdf',
    kind: 'Test report',
  },
  {
    title: 'Acoustic benefits of spray polyurethane foam',
    note: 'How a continuous sealed layer changes sound transmission through a wall or ceiling.',
    file: '/docs/acoustic-benefits-of-spray-polyurethane-foam.pdf',
    kind: 'Product data',
  },
  {
    title: 'Polyurethane foam, cured',
    note: 'Properties of the cured material, for specification and compliance files.',
    file: '/docs/polyurethane-foam-cured.pdf',
    kind: 'Product data',
  },
  {
    title: 'Base Seal safety data sheet',
    note: 'Safety data sheet for the Base Seal product.',
    file: '/docs/base-seal-msds.pdf',
    kind: 'Safety data sheet',
  },
  {
    title: 'Company profile',
    note: 'Capability statement covering equipment, sectors and project scale.',
    file: '/docs/sprayit-solutions-company-profile.pdf',
    kind: 'Company',
  },
]

export const factSheetsIntro: SectionIntro = {
  eyebrow: 'Fact sheets',
  headingLines: ['Documents for', 'your compliance file.'],
  accentWord: 'compliance',
  lede: 'Test reports, safety data sheets and product data. The paperwork a specifier, a builder or a certifier asks for before anything gets signed off.',
}
