export interface Client {
  id: string
  /** Brand name, used for the accessible label and the alt text. */
  name: string
  /** Sector, used for the accessible label. */
  sector: string
  /** File under `public/brands`. */
  file: string
  /** Intrinsic pixel size, so each slot reserves its box before decode. */
  w: number
  h: number
  /**
   * True when the supplied asset is a reversed (white) logo. The trust band is
   * a light bone ground, so these get a dark chip behind them or they vanish.
   */
  reversed?: boolean
}

/**
 * Trust band.
 *
 * Real client-supplied assets from `public/brands`. They arrive in mixed
 * colours, mixed aspect ratios and mixed formats, so the band renders each one
 * contained inside a fixed-height slot rather than trying to normalise them
 * into a single monochrome treatment: several of these logos carry knockout
 * text (Inghams, Steggles, Woodside, Woolworths) that a flat silhouette filter
 * would destroy.
 */
export const clients: Client[] = [
  { id: 'coles', name: 'Coles', sector: 'Retail', file: 'Coles.svg', w: 103, h: 32 },
  {
    id: 'woolworths',
    name: 'Woolworths',
    sector: 'Retail',
    file: 'woolworths-logo-1.webp',
    w: 654,
    h: 533,
  },
  { id: 'bhp', name: 'BHP', sector: 'Resources', file: 'bhp-orange.webp', w: 63, h: 24 },
  { id: 'woodside', name: 'Woodside Energy', sector: 'Energy', file: 'woodside.svg', w: 150, h: 150 },
  { id: 'amart', name: 'Amart Furniture', sector: 'Retail', file: 'amart.svg', w: 300, h: 69 },
  { id: 'elgas', name: 'Elgas', sector: 'Energy', file: 'elgas-logo.svg', w: 456, h: 125 },
  {
    id: 'simplot',
    name: 'Simplot',
    sector: 'Food manufacturing',
    file: 'simplot_logo_standard.svg',
    w: 220,
    h: 96,
  },
  { id: 'sunrice', name: 'SunRice', sector: 'Agribusiness', file: 'sunrice-logo.webp', w: 400, h: 206 },
  {
    id: 'inghams',
    name: "Ingham's",
    sector: 'Poultry',
    file: 'Inghams_AG_Logo_RGB_190.webp',
    w: 190,
    h: 99,
  },
  { id: 'steggles', name: 'Steggles', sector: 'Poultry', file: 'steggles.svg', w: 155, h: 216 },
  {
    id: 'kaefer',
    name: 'KAEFER',
    sector: 'Industrial services',
    file: 'KAEFER_Logo_www_pos.svg',
    w: 300,
    h: 82,
  },
  {
    id: 'docklands',
    name: 'Docklands Studios Melbourne',
    sector: 'Film production',
    // Supplied as the reversed (white) version only.
    file: 'svgexport-1.webp',
    w: 158,
    h: 95,
    reversed: true,
  },
]

export const clientsHeading = 'Trusted by leading brands internationally.'
