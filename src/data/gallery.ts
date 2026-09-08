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
 * ON THE CAPTIONS. These were first written from thumbnails and several were
 * simply wrong: three photographs of a sculpted scenic build inside a film
 * studio had been captioned as an industrial roof line. Every caption here is
 * now written from the full-size image and describes only what is visible in
 * the frame. Where a photograph does not make its building type or its stage of
 * work obvious, it is described plainly rather than given a claim it cannot
 * support. A gallery is evidence, and a wrong caption turns evidence into a
 * liability.
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
    alt: 'Completed white sprayed roof on a processing plant, with plant and silos beyond',
    caption: 'Processing plant roof, sprayed around live plant',
    sector: 'commercial',
  },
  {
    file: g('img-2351.webp'),
    alt: 'Sculpted rock face built from spray foam inside a film studio, with scaffolding and lighting rigs above',
    caption: 'Scenic set build, carved from sprayed foam inside a studio',
    sector: 'commercial',
  },
  {
    file: g('img-2353.webp'),
    alt: 'Close view of the same sculpted foam set, showing the layered rock profile and timber bracing',
    caption: 'The same set, close in on the sculpted profile',
    sector: 'commercial',
  },
  {
    file: g('img-2355.webp'),
    alt: 'Wide sculpted foam rock wall across a studio floor, part way through construction',
    caption: 'A rock wall formed entirely in foam, no other material behind it',
    sector: 'commercial',
  },
  {
    file: g('img-2371.webp'),
    alt: 'Large indoor sports hall with sprayed walls and roof, marked floor and a basketball ring',
    caption: 'Indoor sports hall, walls and roof sealed as one envelope',
    sector: 'commercial',
  },
  {
    file: g('img-2377.webp'),
    alt: 'Looking up at the sprayed roof deck of a sports hall between steel portal frames',
    caption: 'The same hall, sprayed between the portal frames',
    sector: 'commercial',
  },
  {
    file: g('img-2710.webp'),
    alt: 'Interior of a steel-framed shed with sprayed roof and upper walls',
    caption: 'Steel-framed shed, roof and upper walls',
    sector: 'commercial',
  },
  {
    file: g('img-2711.webp'),
    alt: 'Sprayed roof deck of a steel shed seen from below, running the full span between purlins',
    caption: 'Sprayed between purlins across the full span',
    sector: 'commercial',
  },
  {
    file: g('img-1757.webp'),
    alt: 'Sprayed roof deck behind green painted steel trusses',
    caption: 'Applied behind the trusses, following the roof line',
    sector: 'commercial',
  },
  {
    file: g('img-1328.webp'),
    alt: 'Thick sprayed foam applied around the curved concrete base of a large tank',
    caption: 'Tank base, a curve no cut product follows',
    sector: 'commercial',
  },
  {
    file: g('img-0706.webp'),
    alt: 'Sprayed underside of a concrete slab in a plant room, with pipework and cable tray beneath',
    caption: 'Underside of a concrete slab, sprayed around the services',
    sector: 'commercial',
  },
  {
    file: g('img-1297.webp'),
    alt: 'Close view of a smooth sprayed surface covering pipework, leaving an unbroken face',
    caption: 'Sprayed over pipework, leaving one unbroken face',
    sector: 'commercial',
  },

  /* ----------------------------------------------------- residential ---- */
  {
    file: g('img-0993-2.webp'),
    alt: 'Timber-framed room with foam filling every wall cavity, flush with the studs',
    caption: 'Stud walls filled flush to the frame',
    sector: 'residential',
  },
  {
    file: g('img-2277.webp'),
    alt: 'Foam sprayed across a ceiling between exposed timber beams',
    caption: 'Ceiling line, sprayed between the beams',
    sector: 'residential',
  },
  {
    file: g('img-2792.webp'),
    alt: 'Subfloor space with brick piers and the underside of the floor sprayed above',
    caption: 'Underfloor, sprayed between the piers',
    sector: 'residential',
  },
  {
    file: g('pc140546.webp'),
    alt: 'Applicator in full protective equipment spraying a wall behind services',
    caption: 'Applied by our own crew, in full protective gear',
    sector: 'residential',
  },
  {
    file: g('img-2419.webp'),
    alt: 'Roof sheeting lifted to reveal existing glasswool batts and sarking underneath',
    caption: 'Existing batts, exposed where the sheeting came up',
    sector: 'residential',
  },
  {
    file: g('img-2873.webp'),
    alt: 'Underside of an older timber roof frame with battens and loose wiring, before any work',
    caption: 'An older roof frame, before',
    sector: 'residential',
  },
  {
    file: g('img-2872.webp'),
    alt: 'House under construction with crew on site, framing and roof structure exposed',
    caption: 'New build, before the walls are lined',
    sector: 'residential',
  },
  {
    file: g('img-2875.webp'),
    alt: 'Crew member positioning a timber beam under an exposed roof frame on site',
    caption: 'Framing going in, ahead of the spray crew',
    sector: 'residential',
  },
  {
    file: g('img-2877.webp'),
    alt: 'Two crew working on a timber beam inside a building under construction',
    caption: 'On site during the build, not after it',
    sector: 'residential',
  },
]

export const galleryIntro: SectionIntro = {
  eyebrow: 'Photo gallery',
  headingLines: ['Work we have', 'actually done.'],
  accentWord: 'actually',
  lede: 'Photographed on our own jobs. Roofs, walls, subfloors, plant rooms, a sports hall and a film set, mostly in buildings that were still being used at the time.',
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
