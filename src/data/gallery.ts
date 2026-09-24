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
 * ONE ENTRY PER JOB, NOT PER PHOTOGRAPH. The first version of this file was a
 * flat list of photographs, and the second shot of a hall had to be captioned
 * "the same hall", which meant nothing to anyone who had not just read the
 * caption before it. Grouped under the job, the second photograph sits inside
 * the first one's slider, where "the same" needs no saying.
 *
 * THE FIELDS ARE GLENN'S ANSWERS. He filled in a notes document with six
 * questions per photograph: what the job was, the town, the building, what was
 * sprayed and how thick, whether the client can be named, and anything else
 * worth saying. Every answer he gave is a field below, and the page shows a
 * field only when it has a value. Where he left a box empty there is no field,
 * and nothing is invented to fill it. Photo captions say only what the frame
 * shows.
 *
 * Client names are exactly what he wrote against "can we name the client?",
 * and the film set carries the title he gave the job.
 *
 * Each job also carries the surface it was about, so the gallery can be
 * filtered the way a visitor thinks: "show me an underfloor". Specialty covers
 * the jobs that are none of roof, walls or floor: the film sets and the tank.
 *
 * Three photographs are unlisted at his request, because he asked for one or
 * two each of the film set and the zoo: img-2353, img-2875 and img-2877 are
 * still in public/gallery in case he wants one back.
 */

export interface GalleryPhoto {
  file: string
  alt: string
  /** What this frame shows, where the job title alone does not say. */
  caption?: string
  /** Pixel size of the file, so the browser reserves the space before it loads. */
  size?: [number, number]
}

export type GalleryArea = 'roof' | 'walls' | 'underfloor' | 'specialty'

export interface GalleryProject {
  id: string
  /** The job, as Glenn described it. */
  title: string
  sector: 'residential' | 'commercial'
  /** The surface the job was mostly about. */
  area: GalleryArea
  location?: string
  building?: string
  foam?: string
  thickness?: string
  client?: string
  /** His "anything else worth saying" answer. */
  note?: string
  photos: GalleryPhoto[]
}

export const galleryAreas: { id: GalleryArea; label: string }[] = [
  { id: 'roof', label: 'Roof & ceiling' },
  { id: 'walls', label: 'Walls' },
  { id: 'underfloor', label: 'Underfloor' },
  { id: 'specialty', label: 'Specialty work' },
]

const g = (file: string) => `/gallery/${file}`

export const galleryProjects: GalleryProject[] = [
  /* ------------------------------------------------------ commercial ---- */
  {
    id: 'sunrice',
    title: 'SunRice roof insulation',
    sector: 'commercial',
    area: 'roof',
    location: 'Leeton, NSW',
    building: 'Production facility',
    foam: 'Roofing foam with an acrylic coating',
    thickness: '50mm',
    client: 'SunRice',
    photos: [
      {
        file: g('sunrice-roof-hero.webp'),
        alt: 'Completed white sprayed roof on the SunRice processing plant, with plant and silos beyond',
        size: [1100, 303],
      },
    ],
  },
  {
    id: 'riddells-creek',
    title: 'Basketball hall roof',
    sector: 'commercial',
    area: 'roof',
    location: 'Riddells Creek',
    building: 'Sports facility',
    foam: 'Closed cell foam',
    thickness: '50mm',
    photos: [
      {
        file: g('img-2371.webp'),
        alt: 'Large indoor basketball hall with sprayed walls and roof, marked floor and a basketball ring',
        caption: 'Roof and walls, seen from the court',
      },
      {
        file: g('img-2377.webp'),
        alt: 'Looking up at the sprayed roof deck of the basketball hall between steel portal frames',
        caption: 'Between the portal frames',
      },
    ],
  },
  {
    id: 'woodend',
    title: 'Basketball hall',
    sector: 'commercial',
    area: 'roof',
    location: 'Woodend',
    building: 'Sports facility',
    foam: 'Dyed closed cell foam',
    thickness: '50mm',
    photos: [
      {
        file: g('img-2710.webp'),
        alt: 'Interior of a steel-framed basketball hall with sprayed roof and upper walls',
        caption: 'Roof and upper walls',
      },
      {
        file: g('img-2711.webp'),
        alt: 'Sprayed roof deck of the Woodend hall seen from below, running the full span between purlins',
        caption: 'Between the purlins, across the full span',
      },
    ],
  },
  {
    id: 'melbourne-zoo',
    title: 'Melbourne Zoo enclosure roof',
    sector: 'commercial',
    area: 'roof',
    location: 'Melbourne Zoo',
    building: 'Animal enclosure',
    foam: 'Icynene LDC-50 open cell foam',
    thickness: '200mm',
    photos: [
      {
        file: g('img-2873.webp'),
        alt: 'Underside of an animal enclosure roof, sprayed with open cell foam between the steel battens',
        caption: 'The finished roof, from below',
      },
      {
        file: g('img-2872.webp'),
        alt: 'The enclosure building under construction, crew carrying a timber beam beneath the steel roof frame',
        caption: 'The enclosure going up',
      },
    ],
  },
  {
    id: 'glen-iris',
    title: 'Basement car park ceiling',
    sector: 'commercial',
    area: 'roof',
    location: 'Glen Iris',
    building: 'Apartment block',
    foam: 'Closed cell foam',
    thickness: '50mm',
    note: 'Sprayed straight onto the Bondek, the steel decking under the slab.',
    photos: [
      {
        file: g('img-0706.webp'),
        alt: 'Sprayed Bondek ceiling of a basement car park, above storage cages, copper pipework and cable tray',
      },
    ],
  },
  {
    id: 'moon-and-sun',
    title: 'Moon and Sun film set',
    sector: 'commercial',
    area: 'specialty',
    location: 'Docklands, Melbourne',
    building: 'Film studio',
    photos: [
      {
        file: g('img-2351.webp'),
        alt: 'Sculpted rock face built from spray foam inside a film studio, with scaffolding and lighting rigs above',
        caption: 'The set, formed in foam',
      },
      {
        file: g('img-2355.webp'),
        alt: 'A rock wall on the film set, formed entirely from sprayed foam, with a crane working beneath it',
        caption: 'The rock wall, all foam',
      },
    ],
  },
  {
    id: 'fake-freezer',
    title: 'Fake freezer for a film set',
    sector: 'commercial',
    area: 'specialty',
    building: 'Movie set',
    foam: 'Closed cell foam',
    thickness: '50mm',
    note: 'A fake freezer, built to show a body stored inside it on screen.',
    photos: [
      {
        file: g('img-1297.webp'),
        alt: 'Sprayed foam wall moulded to look like the inside of a freezer, with raised coil shapes',
      },
    ],
  },
  {
    id: 'water-tank',
    title: 'Water tank pipework',
    sector: 'commercial',
    area: 'specialty',
    building: 'Water tank',
    foam: 'Closed cell foam',
    thickness: '75mm',
    note: 'The pipes around the tank were insulated before it was backfilled.',
    photos: [
      {
        file: g('img-1328.webp'),
        alt: 'Closed cell foam sprayed around the base of a round concrete water tank and its pipework, before backfilling',
      },
    ],
  },
  {
    id: 'chicken-shed',
    title: 'Chicken shed insulation',
    sector: 'commercial',
    area: 'walls',
    building: 'Chicken shed',
    foam: 'Closed cell foam',
    thickness: '50mm',
    photos: [
      {
        file: g('pc140546.webp'),
        alt: 'Applicator in full protective equipment spraying the wall of a chicken shed behind the drinker line',
      },
    ],
  },

  /* ----------------------------------------------------- residential ---- */
  {
    id: 'benalla',
    title: 'House roof insulation',
    sector: 'residential',
    area: 'roof',
    location: 'Benalla',
    building: 'House',
    foam: 'Icynene LDC-50 open cell foam',
    thickness: '200mm',
    client: 'David Wilson',
    photos: [
      {
        file: g('img-1757.webp'),
        alt: 'Sprayed roof deck behind green painted steel trusses in a house',
      },
    ],
  },
  {
    id: 'roof-and-walls',
    title: 'Roof and wall insulation',
    sector: 'residential',
    area: 'walls',
    building: 'House',
    foam: 'Closed cell foam on the walls, open cell foam under the roof',
    photos: [
      {
        file: g('img-0993-2.webp'),
        alt: 'Timber-framed room with foam filling every wall cavity, flush with the studs',
      },
    ],
  },
  {
    id: 'ceiling',
    title: 'Ceiling insulation',
    sector: 'residential',
    area: 'roof',
    building: 'House',
    foam: 'Closed cell foam',
    thickness: '100mm',
    photos: [
      {
        file: g('img-2277.webp'),
        alt: 'Foam sprayed across a ceiling between exposed timber beams',
        size: [1100, 619],
      },
    ],
  },
  {
    id: 'subfloor',
    title: 'Subfloor insulation',
    sector: 'residential',
    area: 'underfloor',
    photos: [
      {
        file: g('img-2792.webp'),
        alt: 'Subfloor space with brick piers and stumps, the bare underside of the floor above, before spraying',
        caption: 'Before: bare boards and joists over open air',
      },
      {
        file: g('img-2796.webp'),
        alt: 'The same subfloor after spraying, foam covering the underside of the floor between the joists',
        caption: 'After: sprayed between the joists',
      },
    ],
  },
  {
    id: 'cremorne',
    title: 'Curved roof insulation',
    sector: 'residential',
    area: 'roof',
    location: 'Cremorne',
    building: 'House',
    foam: 'Open cell foam',
    thickness: '150mm',
    note: 'The curved sheeting came off one sheet at a time. The old insulation was removed and replaced with open cell foam.',
    photos: [
      {
        file: g('img-2419.webp'),
        alt: 'Curved roof sheeting lifted to reveal the old glasswool batts and sarking underneath',
      },
    ],
  },
]

export const galleryIntro: SectionIntro = {
  eyebrow: 'Photo gallery',
  headingLines: ['Work we have', 'actually done.'],
  accentWord: 'actually',
  lede: 'Photographed on our own jobs: a processing plant, two basketball halls, a basement car park, a zoo enclosure, a chicken shed, two film sets and the roofs, walls and floors of ordinary homes. Each job lists the town, the building, the foam and the thickness, wherever we have it.',
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
