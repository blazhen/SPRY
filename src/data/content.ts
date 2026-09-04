import type { ImageAsset } from '@/lib/images'

/**
 * Section-level editorial copy.
 *
 * Nothing user-facing is written inside JSX. Components read from here and map
 * over it, so the whole site can be re-worded without touching a component.
 */

export interface SectionIntro {
  eyebrow: string
  /** Heading split into lines so the mask reveal can stagger them. */
  headingLines: string[]
  /** Word inside the heading rendered in the accent colour. */
  accentWord?: string
  lede?: string
}

export const hero = {
  /** Each entry is one masked line of the display headline. Lines are set by
   *  hand rather than allowed to wrap, because a wrapped line would break out
   *  of its clip mask and ruin the staggered reveal. */
  headlineLines: ['Australia’s most', 'effective,', 'energy-efficient', 'insulation.'],
  /** Line index that carries the accent treatment. */
  accentLineIndex: 2,
  subhead:
    'Three custom-built vehicle-based spray rigs plus two non-vehicle reactors. Open- and closed-cell polyurethane foams, polyurea and aliphatic coatings. Any size, any site.',
  trust: {
    rating: 5,
    ratingLabel: 'Rated 5 stars by homeowners',
    stat: '40 to 50% more efficient',
    provenance: 'Family-owned · Australia-wide',
  },
  scrollCue: 'Scroll',
  /** Copy for the interactive thermal-camera lens over the hero photograph. */
  thermal: {
    badge: 'Thermal view',
    hint: 'Move to see the heat escaping',
    hintTouch: 'Drag across the house to see the heat escaping',
    reading: 'Heat loss detected',
  },
  background: {
    id: 'photo-1568605114967-8130f3a36994',
    alt: 'Timber-clad home glowing warmly at dusk, every window lit against a cool blue evening',
    clientSwap: true,
  } satisfies ImageAsset,
}

/**
 * "The House" hero: a whole house in cutaway, sealed zone by zone.
 *
 * The evolution of the single-cavity hero. Same mechanic, far bigger canvas:
 * the three zones map exactly onto the real residential services, every leak is
 * heat leaving the building, and the meter counts down through the customer's
 * genuine before and after reading rather than an invented number.
 */
export const heroHouse = {
  headlineLines: ['Stop paying to', 'heat the sky.'],
  accentLineIndex: 1,
  subhead:
    'A third of your heating leaves through the roof, more through the walls, the rest through the floor. Scroll to seal it and watch the difference.',
  scrollCue: 'Scroll to seal the house',
  diagramLabel:
    'Cutaway of a two-storey house showing heat escaping through the roof, walls and underfloor, then each zone being sealed with spray foam.',

  /**
   * The headline claim, approved in the client revision of 31 Aug 2026.
   *
   * This previously counted a single customer's weekly electricity reading
   * down from 245.1 to 210 kW and called the result 14.5%. That job was
   * subfloor only, so presenting it beside a house sealed on all three planes
   * overstated what one surface had achieved. Both the reading and the
   * percentage are gone. What replaces them is the efficiency gain against
   * traditional insulation at the same rated R-value, which is a property of
   * the product rather than of one house.
   */
  meter: {
    label: 'Real-world efficiency gain',
    /** Counts up to the conservative end of the approved 40 to 50% range. */
    savingTo: 40,
    savingLabel: 'vs traditional insulation at the same R-value',
    footnote: 'Compared with traditional insulation at an equivalent rated R-value.',
  },

  beats: [
    {
      id: 'leaking',
      index: '01',
      label: 'Where the heat goes',
      note: 'Warm air you have already paid for leaves through every unsealed surface, all winter, day and night.',
      zone: null,
      start: 0,
      end: 0.18,
    },
    {
      id: 'roof',
      index: '02',
      label: 'Roof & Ceiling',
      note: 'Foam applied to the underside of the roof. Heat stops rising straight out through the ceiling.',
      zone: 'roof',
      start: 0.2,
      end: 0.44,
    },
    {
      id: 'wall',
      index: '03',
      label: 'Wall',
      note: 'A continuous barrier through the cavity, even in an eighty-year-old brick home. The drafts simply go.',
      zone: 'wall',
      start: 0.46,
      end: 0.68,
    },
    {
      id: 'floor',
      index: '04',
      label: 'Underfloor',
      note: 'Sprayed to the underside of the floor. No more cold coming up through the boards, and no more squeaks.',
      zone: 'floor',
      start: 0.7,
      end: 0.86,
    },
    {
      id: 'result',
      index: '05',
      label: '40 to 50% more efficient',
      note: 'Sealed on all three planes, spray foam delivers a 40 to 50% efficiency gain over traditional insulation at the same rated R-value.',
      zone: null,
      start: 0.88,
      end: 1,
    },
  ],
}

/**
 * "Spray It" hero: a pinned cavity that the visitor fills by scrolling.
 *
 * Unlike the earlier pinned hero, scrolling does not fly a camera around. It
 * applies the foam. The cavity starts open and leaking, fills as you scroll,
 * cures, and seals. The headline and CTAs never move, so the mechanic is the
 * only thing changing.
 */
export const heroSpray = {
  headlineLines: ['We seal what', 'batts leave open.'],
  accentLineIndex: 1,
  subhead:
    'Scroll to spray the cavity. Foam goes in as a liquid, expands into every corner, and cures as one continuous skin.',
  scrollCue: 'Scroll to spray',
  diagramLabel:
    'Cross-section of a wall cavity filling with spray foam as the page scrolls, sealing the gaps that cold air passes through.',

  beats: [
    {
      id: 'gap',
      index: '01',
      label: 'The gap you cannot see',
      note: 'Cut batts leave an edge at every stud, corner and pipe. Cold air finds all of them.',
      start: 0,
      end: 0.2,
    },
    {
      id: 'spray',
      index: '02',
      label: 'Sprayed as a liquid',
      note: 'It expands on contact, into the corners and around the awkward joins a cut piece was never going to reach.',
      start: 0.24,
      end: 0.56,
    },
    {
      id: 'cure',
      index: '03',
      label: 'Cured as one skin',
      note: 'Bonded to the substrate in seconds. No seams, no settling, no edges left to leak through.',
      start: 0.6,
      end: 0.8,
    },
    {
      id: 'sealed',
      index: '04',
      label: 'Sealed for good',
      note: 'The warmth you already paid for stays in the room, and the heater finally gets a rest.',
      start: 0.84,
      end: 1,
    },
  ],
}

/**
 * "Knockout" hero: footage playing inside the letterforms.
 *
 * The headline is cut out of a solid ink panel, so whatever is behind it shows
 * only through the type. Built to take a generated video loop; until one is
 * supplied it falls back to a photograph with a slow push, and the composition
 * is identical either way.
 */
export const heroFoam = {
  /** Short by design: knockout type has to be enormous to read. */
  headlineLines: ['SEALED', 'FOR GOOD.'],
  eyebrowOverride: 'Spray foam insulation',
  subhead:
    'One continuous skin of polyurethane foam, sprayed into every gap batts leave behind. Warmth stays in, drafts stay out, and the heater finally gets a rest.',
  scrollCue: 'Scroll',

  /**
   * Drop a generated loop at this path and set `src`. Recommended: 8 to 12
   * seconds, seamless, no audio, H.264 MP4 around 1920x1080, under ~4 MB.
   * Macro of foam expanding into a cavity works best, because the movement
   * needs to read inside narrow letterforms.
   *
   * TODO: client to supply. `src: null` uses the photograph below instead.
   */
  video: {
    src: null as string | null,
    // src: '/hero/foam-loop.mp4',
    poster: 'photo-1621905251189-08b45d6a269e',
  },

  /** Fallback fill, and the video's poster frame. */
  image: {
    id: 'photo-1621905251189-08b45d6a269e',
    alt: 'Insulation applicator working close up on a wall cavity',
    clientSwap: true,
  } satisfies ImageAsset,

  proof: {
    label: 'Measured on a customer’s own meter',
  },
}

/**
 * "Editorial" hero: light, split-screen, type-led.
 *
 * The three heroes before this one all shared a silhouette: full-bleed dark
 * photograph, oversized type bottom-left, an interaction gimmick on top. This
 * one changes the structure rather than the trick. No photograph behind the
 * type, no drag mechanic, and the only light surface on the site.
 */
export const heroEditorial = {
  /** Fixed opening line. */
  headStatic: 'Insulation that',
  /** Swaps on a loop under the static line. All real benefits, no filler. */
  cycling: ['seals every gap.', 'cuts the bills.', 'holds the heat.'],
  subhead:
    'Open- and closed-cell polyurethane foam, applied by the family that owns the rigs. Three vehicle-based spray units and two reactors, anywhere in Australia.',
  scrollCue: 'Scroll',
  proofLabel: 'Measured on a customer’s own meter',
  image: {
    id: 'photo-1600585154340-be6161a56a0c',
    alt: 'Contemporary home lit warmly from within at dusk, framed by dark timber and glass',
    clientSwap: true,
  } satisfies ImageAsset,
}

/**
 * "Comfort" hero: the same room either side of a drag divider.
 *
 * Sells the outcome rather than the mechanism. One photograph, graded two ways,
 * so the two halves line up exactly and the comparison reads as honest.
 */
export const heroComfort = {
  headlineLines: ['The same house.', 'A completely', 'different winter.'],
  accentLineIndex: 2,
  subhead:
    'Spray foam seals the gaps batts leave behind, so the warmth you have already paid for stays in the room. Family-owned, Australia-wide.',
  scrollCue: 'Scroll',
  /** Instruction shown until the visitor takes hold of the divider. */
  hint: 'Drag to compare',
  hintTouch: 'Drag the handle to compare',

  before: {
    tag: 'Before',
    title: 'Uninsulated',
    note: 'Heat leaves through the roof, the walls and the floor. The heater never stops.',
  },
  after: {
    tag: 'After',
    title: 'Spray foamed',
    note: 'One continuous seal. The room holds its warmth for hours after the heating goes off.',
  },

  /** A single image, graded cold on one side and warm on the other. */
  room: {
    id: 'photo-1590725140246-20acdee442be',
    alt: 'Timber-lined living room with a sofa, soft lamplight and a pitched ceiling',
    clientSwap: true,
  } satisfies ImageAsset,
}

/**
 * "The Seal" hero: a pinned scroll-through of a wall cross-section.
 *
 * Each beat owns a slice of the pinned timeline, expressed as `start`/`end` in
 * scroll progress (0 to 1). Component and 3D scene both read these, so the
 * choreography is retimed here rather than in two places.
 */
export const heroSeal = {
  headlineLines: ['See what keeps', 'the cold out.'],
  accentLineIndex: 1,
  subhead:
    'Spray foam does its work where you cannot see it. Scroll into the wall and watch what a continuous seal actually does.',
  scrollCue: 'Scroll to enter the wall',

  beats: [
    {
      id: 'draft',
      index: '01',
      label: 'Superior air barrier',
      note: 'Cold air pushes at the building all winter. It gets through gaps, not through foam.',
      start: 0.08,
      end: 0.34,
      /** Which cross-section band to highlight in the 2D fallback. */
      layer: 1,
    },
    {
      id: 'inside',
      index: '02',
      label: 'Inside the cavity',
      note: 'Past the cladding and the battens, into the layer that does the work.',
      stat: { value: 40, suffix: '%', caption: 'more efficient' },
      start: 0.36,
      end: 0.6,
      layer: 2,
    },
    {
      id: 'held',
      index: '03',
      label: 'Higher real-world R-value than batts',
      note: 'Batts are rated in a lab and installed with gaps. Foam is one bonded skin, so the heat stays put.',
      start: 0.62,
      end: 0.84,
      layer: 2,
    },
    {
      id: 'warm',
      index: '04',
      label: 'A room that holds its warmth',
      note: 'Cold out, heat in, and a heater that runs far less often to keep it that way.',
      start: 0.86,
      end: 1,
      layer: 4,
    },
  ],

  /** Layer names for the 2D cross-section, outside to inside. */
  layers: [
    { id: 'cladding', name: 'External cladding', detail: 'Weather skin' },
    { id: 'batten', name: 'Batten cavity', detail: 'Where air used to move' },
    { id: 'foam', name: 'Closed-cell foam', detail: 'The continuous seal' },
    { id: 'plaster', name: 'Plasterboard', detail: 'Internal lining' },
    { id: 'room', name: 'Your room', detail: 'Warm, and staying that way' },
  ],

  loading: 'Loading the wall…',
  comparison: { sealed: 'Spray foam', leaking: 'Batts' },
}

export const whatIsSprayFoam = {
  intro: {
    eyebrow: 'What is spray foam',
    headingLines: ['One seamless', 'seal, not a', 'stack of gaps.'],
    accentWord: 'seamless',
    lede: 'Applied as a liquid, it expands and cures into one continuous bonded layer. No cut edges, no joins, and no gap where a pipe or a downlight passes through.',
  } satisfies SectionIntro,
  /* Kept deliberately tight. This column sits beside a pinned image, so its
     height decides whether the pinned sequence fits a standard desktop
     viewport at all. Two short paragraphs, not two long ones. */
  body: [
    'Spray polyurethane foam arrives as a liquid and expands on contact: into the cavity, around the pipe, over the awkward join a batt was never going to reach. Seconds later it has cured into one continuous, sealed layer bonded to the substrate.',
    'That is the whole difference. Batts are cut pieces in an imperfect building, so every edge and penetration is a path for air. Foam has no edges, which is why customers describe drafts disappearing rather than merely easing.',
  ],
  /** Three beats of the pinned scroll sequence, advanced by scrub progress. */
  stages: [
    {
      id: 'gaps',
      figure: '01',
      title: 'Batts leave gaps',
      text: 'Rigid pieces cut to fit an imperfect building. Every edge, corner and pipe penetration is a path air can take.',
    },
    {
      id: 'expand',
      figure: '02',
      title: 'Foam expands',
      text: 'Applied as a liquid, it swells into the cavity, around the awkward joins a batt was never going to reach.',
    },
    {
      id: 'seal',
      figure: '03',
      title: 'One sealed skin',
      text: 'Cured hard and bonded to the substrate. No edges, no settling, no gaps left for heat to escape through.',
    },
  ],
  callout: {
    label: 'Applied by us, not subcontracted',
    text: 'Our own rigs, our own applicators, our own quoting. What we quote is what you pay.',
  },
  cta: { label: 'Learn more about spray foam', href: '/spray-foam' },
  image: {
    id: 'photo-1621905251189-08b45d6a269e',
    alt: 'Insulation applicator in a hard hat and gloves working carefully on a wall cavity',
    clientSwap: true,
  } satisfies ImageAsset,
  imageSecondary: {
    id: 'photo-1626885930974-4b69aa21bbf9',
    alt: 'Two site workers in high-visibility vests reviewing a large building project',
    clientSwap: true,
  } satisfies ImageAsset,
}

export const benefitsIntro: SectionIntro = {
  eyebrow: 'Why spray foam',
  headingLines: ['Measured in', 'bills, not', 'brochures.'],
  accentWord: 'bills',
  lede: 'R-value is only one third of the story. Real performance is R-value plus air permeance plus vapour permeance, and foam wins on all three.',
}

export const sceneIntro: SectionIntro = {
  eyebrow: 'Batts vs foam',
  headingLines: ['Watch the', 'heat escape.'],
  accentWord: 'heat',
  lede: 'The same wall, insulated two ways. Switch between them and watch what happens to the heat trying to get out.',
}

export const scene = {
  loading: 'Loading the 3D wall…',

  /** The two insulation treatments the viewer toggles between. */
  modes: [
    {
      id: 'batts' as const,
      label: 'Traditional batts',
      short: 'Batts',
      verdict: 'Heat is escaping',
      heatKey: 'Heat escaping',
      note: 'Cut pieces never fit a real building perfectly. Every gap at an edge, a corner or a pipe is an open path, and the heat finds all of them.',
      leaking: true,
    },
    {
      id: 'foam' as const,
      label: 'Spray foam',
      short: 'Foam',
      verdict: 'Heat is held in',
      heatKey: 'Heat sealed in',
      note: 'Sprayed as a liquid, it expands into every corner and cures as one bonded skin. There is no edge to leak through, so the heat stays in the room.',
      leaking: false,
    },
  ],

  /** Wall build-up, outside to inside. Order matches the model. */
  layers: [
    { id: 'brick', name: 'External brick', detail: 'Weather skin' },
    { id: 'cavity', name: 'Cavity', detail: 'The space being filled' },
    { id: 'insulation', name: 'Insulation', detail: 'Batts or foam, your choice' },
    { id: 'stud', name: 'Timber frame', detail: 'Structure' },
    { id: 'plaster', name: 'Internal lining', detail: 'Your room' },
  ],

  legendTitle: 'Wall build-up',
}

export const servicesIntro: SectionIntro = {
  eyebrow: 'What we insulate',
  headingLines: ['Two halves of', 'the same job.'],
  accentWord: 'halves',
  lede: 'A weatherboard cottage in Preston and a distribution warehouse in Dandenong need the same thing: a building envelope that actually seals.',
}

export const statsIntro: SectionIntro = {
  eyebrow: 'The numbers',
  headingLines: ['What it adds', 'up to.'],
  accentWord: 'adds',
}

export const testimonialsIntro: SectionIntro = {
  eyebrow: 'Customer stories',
  headingLines: ['Warmer houses,', 'smaller bills.'],
  accentWord: 'smaller',
  lede: 'Unedited feedback from homeowners after their install.',
}

export const faqIntro: SectionIntro = {
  eyebrow: 'Questions',
  headingLines: ['The technical', 'bit, plainly', 'explained.'],
  accentWord: 'plainly',
}

export const quoteCta = {
  eyebrow: 'Free, no obligation',
  headingLines: ['Request your', 'free quote.'],
  accentWord: 'free',
  lede: 'Tell us what you are trying to keep warm or cool. We will tell you honestly whether spray foam is the right answer, what it involves, and exactly what it costs.',
  assurances: [
    'Honest, itemised quoting',
    'Australia-wide',
    'Family-owned since day one',
  ],
}

export const footer = {
  blurb:
    'Spray It Solutions is a family-owned insulation contractor in Victoria. We apply polyurethane foam, polyurea and aliphatic coatings to homes, factories, farms and mine sites Australia-wide.',
  columns: [
    {
      title: 'Services',
      links: [
        { label: 'Spray Foam', href: '/spray-foam' },
        { label: 'Residential', href: '/residential' },
        { label: 'Commercial', href: '/commercial' },
      ],
    },
    {
      title: 'Residential',
      links: [
        { label: 'Underfloor', href: '/residential' },
        { label: 'Roof & Ceiling', href: '/residential' },
        { label: 'Wall', href: '/residential' },
      ],
    },
    {
      title: 'Commercial',
      links: [
        { label: 'Factory & Warehouse', href: '/commercial' },
        { label: 'Farming', href: '/commercial' },
        { label: 'Mining', href: '/commercial' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
  ],
}

/** Copy for the stubbed routes, so they are presentable rather than blank. */
export const stubPages = {
  about: {
    eyebrow: 'About',
    title: 'Family-owned, decades deep.',
    lede: 'The full About page is next in the build. It will cover the family story, the rigs, the crew and the standards we hold ourselves to.',
  },
  'spray-foam': {
    eyebrow: 'Spray foam',
    title: 'The technology, in detail.',
    lede: 'A deep dive into open- and closed-cell polyurethane, polyurea and aliphatic coatings: what each is for and how we specify them.',
  },
  residential: {
    eyebrow: 'Residential',
    title: 'Underfloor, roof & wall.',
    lede: 'Detailed pages for each residential application, with real project photography and measured before-and-after results.',
  },
  commercial: {
    eyebrow: 'Commercial',
    title: 'Factory, farming & mining.',
    lede: 'Capability, compliance and case studies for large-span and remote-site work anywhere in Australia.',
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Request a free quote.',
    lede: 'The full enquiry form lands here. Until then, the fastest route to a quote is a phone call.',
  },
} as const
