import type { SectionIntro } from '@/data/content'

/**
 * Content for the four interior pages.
 *
 * Everything here is built from facts already established in this repo: the
 * capability line and address in site.ts, the FAQ answers, the client logos in
 * clients.ts, and the jobs visible on the company YouTube channel (brick veneer
 * injection, stud walls, roofs, subfloors, factory roofs, inflated domes, wine
 * and potato storage sheds, shipping containers).
 *
 * Anything that could not be derived from those is marked REVIEW and needs
 * Glenn to confirm before this goes in front of a customer. Product performance
 * numbers are deliberately absent: see rvalue.ts for why those are gated
 * separately.
 */

export interface PageBullet {
  title: string
  text: string
}

export interface PageStat {
  figure: string
  label: string
}

export interface PageSection {
  id: string
  eyebrow?: string
  heading: string
  /** Word inside the heading rendered in the accent colour. */
  accentWord?: string
  body?: string[]
  bullets?: PageBullet[]
  stats?: PageStat[]
  /** Alternate ground, so long pages keep a rhythm. */
  tone?: 'base' | 'surface'
}

export interface SitePage {
  seoTitle: string
  seoDescription: string
  intro: SectionIntro
  sections: PageSection[]
}

/* ------------------------------------------------------------------ About */

export const aboutPage: SitePage = {
  seoTitle: 'About Spray It Solutions | Family-Owned Insulation Contractor',
  seoDescription:
    'A family-owned spray foam insulation contractor in Victoria, working Australia-wide. Three custom-built spray rigs, our own applicators, and decades of experience.',
  intro: {
    eyebrow: 'About us',
    headingLines: ['A family trade,', 'at industrial scale.'],
    accentWord: 'family',
    lede: 'Spray It Solutions is family-owned and based in Victoria, working Australia-wide. We insulate single rooms and we insulate 30,863 square metre facilities, with the same crew and the same standards.',
  },
  sections: [
    {
      id: 'story',
      eyebrow: 'Who we are',
      heading: 'Decades on the tools, not in an office.',
      accentWord: 'tools',
      body: [
        'We are a family business. The people who quote your job are the people who turn up to do it, and the people who answer the phone have been on a rig themselves. There is no call centre and no layer of account managers between you and the work.',
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
  seoTitle: 'Spray Foam Insulation Explained | Open and Closed Cell',
  seoDescription:
    'How spray polyurethane foam works, the difference between open and closed cell, and where polyurea and aliphatic coatings are used. Plain explanations from a working applicator.',
  intro: {
    eyebrow: 'Spray foam',
    headingLines: ['One material,', 'applied as a liquid.'],
    accentWord: 'liquid',
    lede: 'Spray polyurethane foam arrives wet and expands on contact. That single property is what separates it from every insulation that comes in a cut piece.',
  },
  sections: [
    {
      id: 'how',
      eyebrow: 'How it works',
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
  seoTitle: 'Residential Spray Foam Insulation Australia | Spray It Solutions',
  seoDescription:
    'Roof, wall and underfloor spray foam insulation for homes Australia-wide. Retrofit into existing walls without pulling them apart, or full coverage during construction.',
  intro: {
    eyebrow: 'Residential',
    headingLines: ['Warmer in winter,', 'cooler in summer.'],
    accentWord: 'cooler',
    lede: 'Most homes leak heat through the roof, the walls and the floor at the same time. We seal all three, in existing homes as readily as in new builds.',
  },
  sections: [
    {
      id: 'retrofit',
      eyebrow: 'Existing homes',
      heading: 'Retrofit without gutting the house.',
      accentWord: 'without',
      body: [
        'Retrofitting wall insulation is the job people assume is impossible. Not true. Using spray foam, the cavity is filled from outside through small access points, so nothing internal is disturbed, nobody moves out, and access points are carefully made good.',
        'Older housing is where this pays off hardest. Pre-1990 homes in Victoria usually have zero insulation in the walls or subfloor, and many have inadequate insulation in the ceiling.',
      ],
      tone: 'surface',
    },
    {
      id: 'outcome',
      eyebrow: 'What changes',
      heading: 'The heating stops working so hard.',
      accentWord: 'heating',
      body: [
        'The first thing owners report is not a number on a bill. It is that the house holds its temperature: one temperature room to room, warm for hours after the heating goes off, and no draft crossing the floor.',
        'The bill follows. Because the heating cycles less often and runs at a lower setting to reach the same comfort, the saving continues every season for the life of the building.',
      ],
      tone: 'base',
    },
  ],
}

/* --------------------------------------------------------------- Commercial */

export const commercialPage: SitePage = {
  seoTitle: 'Commercial & Industrial Spray Foam Insulation Australia',
  seoDescription:
    'Spray foam insulation and protective coatings for factories, warehouses, cold storage, data centres, agricultural facilities and mine sites. Projects to 30,863 sqm, Australia-wide.',
  intro: {
    eyebrow: 'Commercial & industrial',
    headingLines: ['Buildings measured', 'in hectares.'],
    accentWord: 'hectares',
    lede: 'Factories, warehouses, cold storage, processing plants, agricultural facilities, data centres and mine sites. Our commercial work runs to 30,863 square metres and $3.44 million on a single project.',
  },
  sections: [
    {
      id: 'scale',
      eyebrow: 'Scale',
      heading: 'Set up for jobs that do not fit in a van.',
      accentWord: 'not',
      body: [
        'Three vehicle-based rigs and two standalone reactors mean we can put a full application setup anywhere, including sites with no power, no shelter and no road access for a standard truck. Large spans are sprayed continuously rather than in patches, which is what keeps the envelope intact across a roof the size of a paddock.',
      ],
      stats: [
        { figure: '30,863', label: 'square metres on a single project' },
        { figure: '$3.44M', label: 'largest single contract value' },
        { figure: '5', label: 'application rigs and reactors' },
      ],
      tone: 'base',
    },
    {
      id: 'specify',
      eyebrow: 'Working with us',
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
