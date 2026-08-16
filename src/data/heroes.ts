/**
 * Registry of every hero built for this project.
 *
 * Drives both the A/B switch in `src/config.ts` and the side-by-side preview
 * pages at /heroes, so adding a variant means editing this list and the map in
 * `pages/HeroPreview.tsx` and nothing else.
 */
export interface HeroVariant {
  id: 'house' | 'spray' | 'foam' | 'editorial' | 'comfort' | 'thermal' | 'seal'
  name: string
  /** One line on what the idea is. */
  idea: string
  /** What it is trying to make the visitor feel or understand. */
  angle: string
  /** Honest note on the trade-off, shown on the preview index. */
  note: string
  usesWebGL: boolean
}

export const heroVariants: HeroVariant[] = [
  {
    id: 'house',
    name: 'The House',
    idea: 'A whole house in cutaway, leaking from roof, walls and underfloor. Scroll seals each zone in turn while the meter counts down.',
    angle: 'Scale and proof. The three zones are the real residential services, and the meter runs through the customer’s genuine before and after reading.',
    note: 'The single-cavity hero at full building scale. SVG, no WebGL. Falls back to a play-on-entry sequence where it cannot pin.',
    usesWebGL: false,
  },
  {
    id: 'spray',
    name: 'Spray It',
    idea: 'A pinned wall cavity that you fill by scrolling. Foam rises, the draft arrows die one by one, and the wall ends sealed and warm.',
    angle: 'Participation. The scroll applies the foam instead of moving a camera, and the headline and CTAs never move.',
    note: 'Drawn as SVG rather than WebGL: sharper than the procedural 3D version, and it weighs nothing. Falls back to a play-on-entry sequence where it cannot pin.',
    usesWebGL: false,
  },
  {
    id: 'foam',
    name: 'Knockout',
    idea: 'The headline is cut out of a solid ink panel, so footage plays inside the letterforms. Dark, warm, centred.',
    angle: 'Craft. One lit thing on a calm dark page, then the panel dissolves and the footage takes the screen.',
    note: 'Built to take a generated video loop. Falls back to a photograph with a slow push until one is supplied, with the same composition and the same scroll moment.',
    usesWebGL: false,
  },
  {
    id: 'editorial',
    name: 'Editorial',
    idea: 'Light, split-screen layout. Type is the subject; the photograph is a panel beside it, not a backdrop.',
    angle: 'Confidence. Reads as an established trade brand rather than a tech demo.',
    note: 'The only light hero, and the only one with no drag or scroll mechanic. Fastest of the four.',
    usesWebGL: false,
  },
  {
    id: 'comfort',
    name: 'Comfort',
    idea: 'The same room either side of a drag divider: one cold winter, one warm one.',
    angle: 'The outcome. Warmth you can see, rather than building science.',
    note: 'One photograph graded two ways, so the halves line up exactly. Needs real before/after photography to reach its potential.',
    usesWebGL: false,
  },
  {
    id: 'thermal',
    name: 'Thermal Vision',
    idea: 'A thermal camera lens you drag across the house, revealing a heat-mapped view underneath.',
    angle: 'Proof. Shows the invisible thing being sold.',
    note: 'Real gradient-map LUT via an SVG filter, not a CSS hue-rotate. Closest in feel to the reference sites.',
    usesWebGL: false,
  },
  {
    id: 'seal',
    name: 'The Seal',
    idea: 'A pinned scroll-through of a wall cross-section: cold outside, sealed, warm inside.',
    angle: 'Mechanism. Four beats, each carrying one benefit.',
    note: 'The most ambitious and the heaviest. Loads Three.js on desktop only; compact screens get a stepped SVG walk instead.',
    usesWebGL: true,
  },
]
