import type { SectionIntro } from '@/data/content'

/**
 * Content for the interior pages' visual sections.
 *
 * Kept apart from pages.ts because these drive diagrams and interactive
 * components rather than prose, and their shapes are dictated by what the
 * component has to draw.
 */

/* ---------------------------------------------------------------- About */

export interface Capability {
  figure: string
  title: string
  text: string
  icon: 'truck' | 'factory' | 'map' | 'users'
}

export const capabilityIntro: SectionIntro = {
  eyebrow: 'What we run',
  headingLines: ['Five ways', 'to get foam.'],
  accentWord: 'Five',
  lede: 'Most of what we can take on comes down to the equipment. Between the vehicle rigs and the standalone reactors, there are very few sites we cannot reach.',
}

export const capabilities: Capability[] = [
  {
    figure: '3',
    title: 'Vehicle-based spray rigs',
    text: 'Custom-built trucks carrying a complete application setup: reactor, compressor, generator, hose and materials. They work on sites with no power, no water and no shelter.',
    icon: 'truck',
  },
  {
    figure: '2',
    title: 'Standalone reactors',
    text: 'For work a truck cannot get near. Craned onto a roof, wheeled through a factory door, or set up inside a structure that has no vehicle access at all.',
    icon: 'factory',
  },
  {
    figure: 'Any',
    title: 'Size, any site',
    text: 'A single underfloor in a weatherboard cottage and a 30,863 square metre facility are the same business to us, run by the same crew to the same standard.',
    icon: 'map',
  },
  {
    figure: '100%',
    title: 'Our own applicators',
    text: 'No subcontractors. The people on your site are our people, which is the only reason we are willing to stand behind the finish.',
    icon: 'users',
  },
]

/* ----------------------------------------------------------- Spray foam */

export interface FoamProperty {
  label: string
  /** 0 to 100, for the comparison bar. Relative, not an absolute measurement. */
  open: number
  closed: number
  /** What the bar is actually showing, in words. */
  openNote: string
  closedNote: string
}

export const foamIntro: SectionIntro = {
  eyebrow: 'Open cell vs closed cell',
  headingLines: ['Two foams.', 'Not interchangeable.'],
  accentWord: 'Not',
  lede: 'Anyone who only offers one will tell you theirs is right for everything. The honest answer is that they do different jobs, and picking wrong costs you either money or performance.',
}

/**
 * Relative comparison only.
 *
 * These bars show how the two foams rank against each other on each property,
 * not measured values. Absolute figures (density in kg/m3, R per 100mm, vapour
 * resistance) are deliberately absent: they vary by product and batch, and
 * publishing a specific number invites the same substantiation problem as the
 * R-value claim. REVIEW with Glenn if he wants real product figures shown.
 */
export const foamProperties: FoamProperty[] = [
  {
    label: 'Expansion on contact',
    open: 95,
    closed: 40,
    openNote: 'Expands dramatically, filling awkward cavities cheaply',
    closedNote: 'Expands modestly, building density instead of volume',
  },
  {
    label: 'Thermal performance per millimetre',
    open: 55,
    closed: 92,
    openNote: 'Good, but needs more thickness for the same result',
    closedNote: 'Highest available, where depth is limited',
  },
  {
    label: 'Moisture vapour permeable',
    open: 92,
    closed: 35,
    openNote: 'Vapour permeable, so the structure can still dry',
    closedNote: 'Resists water and vapour, suits cold and wet exposure',
  },
  {
    label: 'Structural rigidity added',
    open: 75,
    closed: 85,
    openNote: 'Moves with the building envelope without delaminating',
    closedNote: 'Rigid, measurably stiffens the substrate it bonds to',
  },
  {
    label: 'Cost per unit of coverage',
    open: 90,
    closed: 45,
    openNote: 'The economical choice for large, unrestricted areas',
    closedNote: 'Costs more, earns it where the job demands it',
  },
]

export const foamUseCases = {
  open: {
    title: 'Open cell',
    tag: 'Roofs, ceilings, internal walls, subfloors',
    points: [
      'Most residential roof lines',
      'Stud walls where drying capacity matters',
      'Subfloors: generally open-cell LDC-50 for suitable dry, ventilated subfloors',
      'Condensation control',
      'Large areas where budget covers more coverage',
      'Can improve acoustic performance of a wall or ceiling',
    ],
  },
  closed: {
    title: 'Closed cell',
    tag: 'Commercial and specific residential requirements',
    points: [
      'Cool rooms, condensation control and warehouse insulation',
      'Shipping containers and steel structures',
      'Where thickness is limited but performance is not',
    ],
  },
}

/* ---------------------------------------------------------- Residential */

export interface HouseSurface {
  id: 'roof' | 'walls' | 'underfloor'
  label: string
  headline: string
  text: string
  /** Rough share of heat loss. Indicative, for the diagram only. */
  share: string
}

export const surfacesIntro: SectionIntro = {
  eyebrow: 'Where the heat and cooling goes',
  headingLines: ['Three surfaces.', 'Seal all three.'],
  accentWord: 'Three',
  lede: 'Insulating one surface and leaving the others helps, but heating and cooling simply takes whichever path is still open. Select a surface to see what it costs you.',
}

export const houseSurfaces: HouseSurface[] = [
  {
    id: 'roof',
    label: 'Roof and ceiling',
    headline: 'The biggest single loss in most homes.',
    text: 'Heat rises, and a roof cavity is usually the least protected part of the building. We insulate around roof and ceiling penetrations while maintaining all required clearances around downlights, flues and electrical equipment.',
    share: 'Around a third',
  },
  {
    id: 'walls',
    label: 'Walls',
    headline: 'Sprayed in new builds, injected in existing ones.',
    text: 'During construction the foam goes between studs before lining. In an existing brick veneer home the cavity is filled from outside through small access points, so nothing internal is disturbed and nobody has to move out.',
    share: 'Around a quarter',
  },
  {
    id: 'underfloor',
    label: 'Underfloor',
    headline: 'The one almost everybody skips.',
    text: 'A suspended timber floor sits above open, moving air. That is exactly why the floor is cold in July, and why insulating the roof alone never quite fixes the room.',
    share: 'The rest',
  },
]

/* ----------------------------------------------------------- Commercial */

export interface SectorCard {
  id: string
  label: string
  title: string
  text: string
  image: string
}

export const sectorsIntro: SectionIntro = {
  eyebrow: 'Sectors',
  headingLines: ['Where the', 'work happens.'],
  accentWord: 'work',
  lede: 'Commercial insulation is rarely about comfort. It is about holding a temperature, protecting a product, or stopping condensation destroying a structure.',
}

const yt = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

/** Imagery is placeholder, from Glenn's channel. See sectors.ts for the swap note. */
export const commercialSectors: SectorCard[] = [
  {
    id: 'cold',
    label: 'Cold storage',
    title: 'Produce stores and chillers',
    text: 'Closed cell foam on controlled-temperature storage, where every degree held is money not spent on refrigeration.',
    image: yt('XDYjdr9lJRo'),
  },
  {
    id: 'industrial',
    label: 'Factories & warehouses',
    title: 'Spans measured in hectares',
    text: 'Roof and wall areas sprayed continuously rather than in patches, cutting the heat load that makes a shed unworkable in summer.',
    image: yt('gOE23pCeQPc'),
  },
  {
    id: 'agri',
    label: 'Agriculture',
    title: 'Wineries, sheds and packing floors',
    text: 'Applied straight onto sheeting with no framing required, in working buildings that cannot afford long shutdowns.',
    image: yt('QUGdEIRih8g'),
  },
  {
    id: 'processing',
    label: 'Processing plants',
    title: 'Production floors and plant rooms',
    text: 'Roof and wall systems on working processing facilities, sprayed around plant and services without shutting the line down for longer than the job needs.',
    // The SunRice roof, from the client's own case study post on the site this
    // replaces. Their only published photograph of a processing plant job.
    image: '/gallery/sunrice-roof-hero.webp',
  },
  {
    id: 'specialist',
    label: 'Specialist structures',
    title: 'Shapes nothing else will follow',
    text: 'Inflated domes, containers and curved structures where a cut product simply cannot make contact with the surface.',
    image: yt('Ht_W3K2Rhi0'),
  },
]
