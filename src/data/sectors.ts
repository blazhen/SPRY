/**
 * Residential and commercial showcase.
 *
 * PLACEHOLDER IMAGERY. These are frames from Glenn's own YouTube channel, used
 * so the transition can be reviewed with real jobs rather than stock photos or
 * empty boxes. They are only 480x360, which is well short of what a full-bleed
 * band deserves, so they are a stand-in and not the finished asset.
 *
 * TO REPLACE: drop the high-resolution files into `public/work/` and change
 * each `image` to its path, e.g. `/work/factory-roof.webp`. Nothing else needs
 * to change. Keep roughly a 4:3 or wider crop.
 */

export interface SectorSlide {
  id: string
  /** Residential or commercial. Drives which stat block shows. */
  sector: 'residential' | 'commercial'
  title: string
  caption: string
  image: string
}

const yt = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

export const sectorCopy = {
  eyebrow: 'What we insulate',
  headingResidential: 'Homes.',
  headingCommercial: 'And buildings measured in hectares.',
  lede: 'The same crew and the same materials, at both ends of the scale. Use the controls to switch, or let it run.',
  residentialLabel: 'Residential',
  commercialLabel: 'Commercial & industrial',
  /** Shown while the commercial slide is active. Client-supplied figures. */
  commercialStats: [
    { figure: '30,863', label: 'sqm, single project' },
    { figure: '$3.44M', label: 'largest contract' },
  ],
  residentialStats: [
    { figure: '40 to 50%', label: 'more efficient, same R-value' },
    { figure: '3', label: 'surfaces sealed as one' },
  ],
}

/**
 * Alternating deliberately: residential, commercial, residential, commercial.
 * The brief is that the site must not read as residential-only, so a visitor
 * who watches for a few seconds sees commercial work without doing anything.
 */
export const sectorSlides: SectorSlide[] = [
  {
    id: 'res-wall',
    sector: 'residential',
    title: 'Stud walls',
    caption: 'Filled cavity by cavity, edge to edge.',
    image: yt('N_ftWt3qjjM'),
  },
  {
    id: 'com-factory',
    sector: 'commercial',
    title: 'Factory roof',
    caption: 'Industrial span, sprayed continuously across the sheeting.',
    image: yt('M-x2olNQQag'),
  },
  {
    id: 'res-subfloor',
    sector: 'residential',
    title: 'Underfloor, suspended timber',
    caption: 'The surface most homes leave bare.',
    image: yt('Zsicob298CI'),
  },
  {
    id: 'com-dome',
    sector: 'commercial',
    title: 'Inflated dome, PIR foam',
    caption: 'A structure conventional insulation cannot follow.',
    image: yt('Ht_W3K2Rhi0'),
  },
  {
    id: 'res-house',
    sector: 'residential',
    title: 'Whole-house fit-out',
    caption: 'Wall cavities and framing, Main Ridge.',
    image: yt('8VLbxYIWyzI'),
  },
  {
    id: 'com-roof',
    sector: 'commercial',
    title: 'Roof line at R6.0',
    caption: 'Open-cell Icynene LDC-50 under the roof.',
    image: yt('xO1WzJZxoUY'),
  },
]

/** Milliseconds each slide holds before the crossfade. */
export const SECTOR_INTERVAL = 4200
