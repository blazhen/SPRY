import type { SectionIntro } from '@/data/content'
import { routes } from '@/data/routes'

/**
 * Content for the interior pages.
 *
 * Built from facts already established in this repo: the capability line and
 * address in site.ts, the FAQ answers, the client logos in clients.ts, the
 * jobs on the company YouTube channel and in the photo gallery.
 *
 * TITLES AND DESCRIPTIONS. Each page's seoTitle and seoDescription are the ones
 * the SEO agency (Clickmatix) already has live on the old site for the same
 * address, carried across word for word so the cutover does not undo their
 * on-page work. The one change is About, whose live description said
 * "family-owned"; the client asked on 2 October for no family wording.
 *
 * THE RESIDENTIAL PAGE is the agency's own copy, from their outline "Webpage
 * outline 1, Residential Spray Foam Insulation Melbourne, Aug-Sep 2026", with
 * their H1, H2s and FAQs as written. The phone number in their closing line is
 * the site's number rather than the one in the draft.
 *
 * KEYWORD LINES. Pages without an agency outline yet keep their headline and
 * carry the search phrase as the first line inside the H1 (`intro.keyword`).
 * The phrase is the one the agency's live title for that address targets.
 */

export interface PageBullet {
  title: string
  text: string
}

export interface PageStat {
  figure: string
  label: string
}

/** A run of body copy: a paragraph, a plain list, or a list of term and text. */
export type CopyBlock = { p: string } | { list: string[] } | { terms: Array<[term: string, text: string]> }

/** A photograph that travels with its alt text and its pixel size. */
export interface PagePhoto {
  src: string
  alt: string
  size: [number, number]
}

/** A card in a grid under a section, e.g. one per service. */
export interface PageCard {
  title: string
  body: string[]
  href?: string
  linkLabel?: string
  image?: PagePhoto
}

export interface PageSection {
  id: string
  eyebrow?: string
  /**
   * The search phrase for this section. When set it replaces the eyebrow and
   * becomes the first line inside the H2, the same way the page H1s carry
   * theirs, so every heading the agency asked about leads with a keyword.
   */
  keyword?: string
  /** Empty for an unheaded run of copy straight after the page heading. */
  heading: string
  /** Word inside the heading rendered in the accent colour. */
  accentWord?: string
  body?: string[]
  /** Ordered copy, for sections that mix paragraphs and lists. */
  blocks?: CopyBlock[]
  bullets?: PageBullet[]
  stats?: PageStat[]
  cards?: PageCard[]
  /** A link under the copy, to the page that goes deeper. */
  link?: { label: string; href: string }
  /** Alternate ground, so long pages keep a rhythm. */
  tone?: 'base' | 'surface'
}

export interface SitePage {
  seoTitle: string
  seoDescription: string
  intro: SectionIntro
  /** A real job photograph beside the heading. */
  hero?: PagePhoto
  sections: PageSection[]
}

/* ----------------------------------------------------------------- photos */

const w = (file: string) => `/work/${file}`

export const photos = {
  residential: {
    src: w('residential-spraying.webp'),
    alt: 'Applicator spraying foam onto the roof framing of a house, standing on a step with the hose behind him',
    size: [955, 634],
  },
  underfloor: {
    src: w('underfloor-spraying.webp'),
    alt: 'Applicator in a protective suit spraying foam onto the underside of a timber floor, between the joists',
    size: [941, 619],
  },
  roof: {
    src: w('roof-spraying.webp'),
    alt: 'Applicator on a scaffold spraying foam onto the underside of a timber-framed roof',
    size: [1400, 1050],
  },
  walls: {
    src: w('wall-spraying.webp'),
    alt: 'Applicator spraying foam into an open stud wall, with sprayed wall cavities beside him',
    size: [842, 599],
  },
  commercial: {
    src: w('commercial-spraying.webp'),
    alt: 'Two applicators spraying foam onto the wall panels of a large storage shed',
    size: [1400, 1050],
  },
  sprayFoam: {
    src: w('sprayfoam-spraying.webp'),
    alt: 'Applicator on a stand spraying foam along the inside wall of a long building, the hose running across the floor',
    size: [1400, 1050],
  },
  underfloorFinished: {
    src: w('underfloor-finished.webp'),
    alt: 'Subfloor with foam sprayed across the underside of the floor, around the ducting and between the stumps',
    size: [1400, 1050],
  },
  roofFinished: {
    src: w('roof-finished.webp'),
    alt: 'Foam sprayed across the underside of a house roof behind green painted steel trusses',
    size: [1400, 1050],
  },
  wallsFinished: {
    src: w('walls-finished.webp'),
    alt: 'Room with foam sprayed into every wall cavity and across the ceiling, before the linings go on',
    size: [1400, 1050],
  },
} satisfies Record<string, PagePhoto>

/* ------------------------------------------------------------------ About */

export const aboutPage: SitePage = {
  seoTitle: "About SprayIT Solutions | Melbourne's Spray Foam Insulation Experts",
  seoDescription:
    'Discover SprayIT Solutions, a Melbourne business specialising in residential and commercial spray foam insulation since 1995. Learn about our expertise and commitment to energy efficiency.',
  intro: {
    eyebrow: 'About us',
    keyword: 'About SprayIT Solutions',
    headingLines: ['A specialist team,', 'at industrial scale.'],
    accentWord: 'specialist',
    lede: 'SprayIT Solutions is based in Carrum Downs, Melbourne, and works Australia-wide. We insulate single rooms and we insulate facilities of more than 30,000 square metres, with the same crew and the same standards.',
  },
  sections: [
    {
      id: 'story',
      eyebrow: 'Who we are',
      keyword: 'Melbourne Spray Foam Insulation Contractors',
      heading: 'Decades on the tools, not in an office.',
      accentWord: 'tools',
      body: [
        'We have worked with spray-applied insulation since 1995. The people who quote your job know the work first-hand, our own crews apply it, and the people who answer the phone have been on a rig themselves. There is no call centre and no layer of account managers between you and the work.',
        'That matters most when something is unusual. Older housing stock, a shed that was never designed to be insulated, an inflated dome, a cool room that has to hold temperature. Those jobs are decided on site by someone who has done them before.',
      ],
      tone: 'base',
    },
    {
      id: 'standards',
      eyebrow: 'How we work',
      heading: 'Quote honestly, then do what we said.',
      accentWord: 'honestly',
      body: [
        'If spray foam is not the right answer for your building, we will tell you. It is a better use of everyone’s day and it is the reason most of our work arrives by referral.',
        'What we quote is what you pay. Where a job turns out to be different from what was described, we stop and talk to you before doing anything that changes the price.',
      ],
      tone: 'base',
    },
  ],
}

/* -------------------------------------------------------------- Spray foam */

export const sprayFoamPage: SitePage = {
  seoTitle: 'Closed Cell & Open Cell Spray Foam | Complete Guide',
  seoDescription:
    'Learn the difference between closed cell and open cell spray foam insulation. Discover the benefits, applications and expert solutions from SprayIT Solutions.',
  intro: {
    eyebrow: 'Spray foam',
    keyword: 'Closed Cell & Open Cell Spray Foam',
    headingLines: ['One material,', 'applied as a liquid.'],
    accentWord: 'liquid',
    lede: 'Spray polyurethane foam arrives wet and expands on contact. That single property is what separates it from every insulation that comes in a cut piece.',
  },
  hero: photos.sprayFoam,
  sections: [
    {
      id: 'how',
      eyebrow: 'How it works',
      keyword: 'How Spray Foam Insulation Works',
      heading: 'It fills the shape the building actually is.',
      accentWord: 'actually',
      body: [
        'Two liquid components mix at the spray gun, expand within seconds and cure into a bonded insulation layer.',
        'Buildings are not built to the tolerances that cut insulation assumes. Studs are not perfectly spaced, cavities are not perfectly square, and services run through the middle of everything. Foam does not care, because it is shaped by the cavity rather than trimmed to fit it.',
      ],
      tone: 'base',
    },
    {
      id: 'air',
      eyebrow: 'Why it performs',
      keyword: 'Spray Foam Air Sealing',
      heading: 'Insulation slows heat. Air sealing stops it leaving.',
      accentWord: 'leaving',
      body: [
        'A building loses heat three ways: conduction, convection and air leakage. Rated insulation values only describe the first one. That is why two buildings insulated to the same number on paper can behave nothing like each other once the wind gets up.',
        'Because foam cures as one continuous layer bonded to the substrate, it deals with all three at once. There are no edges between pieces, no settling over time, and no gap where a service penetrates. Customers describe this as drafts disappearing rather than merely easing.',
      ],
      tone: 'base',
    },
  ],
}

/* -------------------------------------------------------------- Residential */

export const residentialPage: SitePage = {
  seoTitle: 'Home Insulation Melbourne | Residential Spray Foam Experts',
  seoDescription:
    "Upgrade your home's comfort with residential spray foam and retrofit insulation in Melbourne. Expert solutions for new and existing homes.",
  intro: {
    eyebrow: 'Residential',
    headingLines: ['Residential Spray Foam', 'Insulation Melbourne'],
    accentWord: 'Melbourne',
    lede: 'A comfortable home is about more than just heating and cooling. Quality insulation helps manage how heat enters and leaves your living spaces year-round. At SprayIT Solutions, we offer professional residential spray foam insulation for homes across Melbourne, whether you’re building new, renovating, or upgrading an existing property.',
  },
  hero: photos.residential,
  sections: [
    {
      id: 'intro',
      heading: '',
      blocks: [
        { p: 'Spray foam expands after its application, filling gaps, cracks, and hard-to-reach areas. This creates a strong thermal and air barrier across the treated surface, reducing unwanted heat transfer and air movement through the area. Performance also depends on the product, installed thickness, and proper application.' },
        { p: 'For homeowners dealing with draughts, cold rooms, or uncomfortable temperature changes, upgrading insulation can make a real difference. Spray foam is also a good choice if you want a long-lasting solution. Our team can look at your property and recommend the best areas and ways to use it.' },
      ],
      tone: 'base',
    },
    {
      id: 'retrofit',
      eyebrow: 'Existing homes',
      heading: 'Retrofit Insulation for Existing Homes',
      accentWord: 'Retrofit',
      blocks: [
        { p: 'Retrofit insulation means adding or upgrading insulation in a home that has already been built. It may be worth considering when an older property has little insulation, damaged materials, or areas where insulation no longer performs as it should.' },
        { p: 'Signs that your home may need an insulation upgrade can include:' },
        {
          list: [
            'Rooms that become excessively hot in summer',
            'Cold floors or noticeably chilly rooms in winter',
            'Draughts and unwanted air movement',
            'Uneven temperatures between different parts of the home',
            'Gaps or exposed cavities',
            'Insulation that has deteriorated, shifted or become ineffective',
          ],
        },
        { p: 'When considering retrofit insulation in Melbourne, you need to assess the existing structure first. Access, cavity size, building materials, and the condition of the area can all affect the available options.' },
        { p: 'Spray foam may suit certain retrofit applications where access and the existing structure allow it. Because the foam expands into suitable spaces, it can help insulate areas that may be difficult to treat. However, it is not the right solution for every part of every property. SprayIT Solutions can assess your home and recommend an approach based on the areas that need attention.' },
      ],
      link: { label: 'Retrofit wall insulation', href: routes.walls },
      tone: 'surface',
    },
    {
      id: 'services',
      eyebrow: 'What we insulate',
      heading: 'Residential Insulation Services',
      accentWord: 'Services',
      blocks: [
        { p: 'Every part of a home plays a different role in thermal performance. SprayIT Solutions provides residential spray foam solutions for several key areas, helping homeowners address insulation and air-sealing requirements where appropriate.' },
      ],
      cards: [
        {
          title: 'Underfloor Spray Foam Insulation',
          body: [
            'Underfloor areas can contribute to cold floors and uncomfortable living spaces, where the underside of the home is exposed to outside air.',
            'Spray foam can be applied to suitable underfloor surfaces to help create a thermal barrier and reduce unwanted air movement. This can help improve the conditions inside rooms above the treated area.',
          ],
          href: routes.underfloor,
          linkLabel: 'Underfloor insulation',
          image: photos.underfloorFinished,
        },
        {
          title: 'Roof & Ceiling Insulation',
          body: [
            'A poorly insulated roof or ceiling can let heat move in and out of the home more easily. Roof and ceiling insulation helps reduce heat transfer through the upper part of the home. Depending on the building design, spray foam may be applied to an appropriate roof substrate or at ceiling level.',
            'The correct approach depends on the roof construction, climate, existing insulation, ventilation and condensation-control requirements. These factors should be assessed before selecting a product or installation method.',
          ],
          href: routes.roofCeiling,
          linkLabel: 'Roof and ceiling insulation',
          image: photos.roofFinished,
        },
        {
          title: 'Wall and Retrofit Cavity Insulation',
          body: [
            'Wall insulation options depend on whether the wall cavity is open or already enclosed. At the construction stage or during renovations, we apply spray polyurethane foam to suitable, accessible wall areas before installing the internal lining.',
            'For appropriate existing wall cavities, SprayIT Solutions offers InjectaCore, a specialist injection-foam insulation system installed through small access points without needing the entire wall lining to be removed.',
            'The wall construction, cavity condition, moisture management and existing materials must be assessed before recommending either system.',
          ],
          href: routes.walls,
          linkLabel: 'Wall and retrofit insulation',
          image: photos.wallsFinished,
        },
      ],
      tone: 'base',
    },
    {
      id: 'why-insulate',
      eyebrow: 'Why insulate',
      heading: 'Why Does Your Home Need Insulation?',
      accentWord: 'Insulation?',
      blocks: [
        { p: 'Insulation helps manage heat movement through the building. When insulation is missing, damaged or inadequate, outdoor conditions can have a greater effect on the temperature inside your home.' },
        { p: 'During Melbourne summers, heat can enter through the roof, walls and other parts of the building. In winter, warmth generated inside can escape through poorly insulated areas. The result can be rooms that are difficult to keep comfortable, even when heating or cooling is running.' },
        { p: 'Poor insulation may also contribute to:' },
        {
          terms: [
            ['Cold floors and rooms', 'Some areas can remain noticeably colder than others.'],
            ['Draughts and air leakage', 'Gaps can allow outside air in and conditioned air out.'],
            ['Uneven temperatures', 'Different rooms may respond differently to outdoor conditions.'],
            ['Poor thermal efficiency', 'You may need more heating or cooling to maintain comfort.'],
            ['Condensation concerns', 'In some homes, moisture and condensation can be affected by building design, ventilation, and insulation conditions.'],
          ],
        },
        { p: 'Improving insulation is therefore not simply about adding a product to the home. It is about addressing areas where heat transfer or air movement may be affecting how the property performs.' },
        { p: 'If you’re considering home insulation in Melbourne, a professional assessment can help identify problem areas and determine the right insulation approach.' },
      ],
      tone: 'surface',
    },
    {
      id: 'assessment',
      eyebrow: 'Before we quote',
      heading: 'How We Assess Your Home',
      accentWord: 'Assess',
      blocks: [
        { p: 'Before recommending an insulation system, SprayIT Solutions considers:' },
        {
          list: [
            "The home's age and construction.",
            'The area being insulated.',
            'Existing insulation and building materials.',
            'Available access.',
            'Moisture, ventilation and condensation conditions.',
            'Required R-value and installed thickness.',
            'Electrical wiring, plumbing and other services.',
            'Termite inspection and access requirements.',
            'Whether open-cell, closed-cell, or InjectaCore is appropriate.',
          ],
        },
        { p: 'We recognise every home has its own layout and insulation needs. Our assessment approach means you get a solution tailored to your property.' },
      ],
      tone: 'base',
    },
    {
      id: 'why-us',
      eyebrow: 'Why us',
      heading: 'Why Choose SprayIT Solutions',
      accentWord: 'SprayIT',
      blocks: [
        { p: 'SprayIT Solutions has worked with spray-applied insulation systems since 1995, gathering more than 30 years of industry experience. We provide residential insulation services throughout Melbourne and across regional Victoria.' },
        { p: 'We are licensed installers of Icynene LD-C-50 open-cell foam. We also offer closed-cell spray foam and InjectaCore injection foam for retrofitting existing wall cavities. We do site-specific assessments, considering the building construction, access, moisture conditions, and required thermal performance before proposing a system.' },
        { p: 'Where applicable, we can provide relevant product technical data, CodeMark certification, fire-performance information, and installation documentation.' },
        { p: 'CodeMark certification applies to the specified product and approved application, not automatically to every spray foam system or roof design.' },
      ],
      tone: 'surface',
    },
  ],
}

/** The closing call to action on Residential, from the agency outline. */
export const residentialCta = {
  heading: 'Upgrade Your Home Insulation',
  text: 'Whether you are building new, renovating, or upgrading an existing home, SprayIT Solutions can help identify the right insulation system for your property.',
}

/* --------------------------------------------------------------- Commercial */

export const commercialPage: SitePage = {
  seoTitle: 'Commercial Spray Foam Insulation | Shed Insulation Experts',
  seoDescription:
    'Enhance energy efficiency with commercial spray foam insulation. SprayIT Solutions insulates sheds, warehouses, factories and commercial buildings across Victoria.',
  intro: {
    eyebrow: 'Commercial & industrial',
    keyword: 'Commercial Spray Foam Insulation',
    headingLines: ['Buildings measured', 'in hectares.'],
    accentWord: 'hectares',
    lede: 'Factories, warehouses, cold storage, processing plants, agricultural facilities, data centres and mine sites. Our commercial work includes more than 30,000 square metres completed under a single contract.',
  },
  hero: photos.commercial,
  sections: [
    {
      id: 'scale',
      eyebrow: 'Scale',
      keyword: 'Commercial Spray Foam Insulation at Scale',
      heading: 'Set up for jobs that do not fit in a van.',
      accentWord: 'not',
      body: [
        'Three vehicle-based rigs and two standalone reactors mean we can put a full application setup anywhere, including sites with no power, no shelter and no road access for a standard truck. Large spans are sprayed continuously rather than in patches, which is what keeps the envelope intact across a roof the size of a paddock.',
      ],
      stats: [
        { figure: '30,000+ m²', label: 'completed under a single commercial contract' },
        { figure: '5', label: 'application rigs and reactors' },
        { figure: '3+', label: 'decades of experience' },
      ],
      tone: 'base',
    },
    {
      id: 'specify',
      eyebrow: 'Working with us',
      keyword: 'Commercial Insulation, Specified and Applied',
      heading: 'Specified properly, then applied by us.',
      accentWord: 'properly',
      body: [
        'We work directly with builders, facility managers and project engineers, and we are comfortable being held to a specification. Product selection, thickness and coating system are documented against what the building has to achieve, not against what happens to be on the truck.',
        'Because we apply it ourselves rather than subcontracting, the crew on site is accountable for the result. On multi-stage projects that is usually the difference between a program that holds and one that does not.',
      ],
      tone: 'base',
    },
  ],
}
