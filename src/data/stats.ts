export interface Stat {
  id: string
  /** Number the count-up animates to. */
  value: number
  /** Rendered before the number, e.g. a plus. */
  prefix?: string
  /** Rendered after the number, e.g. % or +. */
  suffix?: string
  /** A unit set smaller after the suffix, e.g. m². */
  unit?: string
  /** Decimal places to hold during and after the count-up. */
  decimals?: number
  label: string
  detail: string
}

/**
 * Count-up band.
 *
 * The first two entries used to be single customer bills: 14.5% from an Altona
 * job and 25% from Devonport. Glenn flagged both as technically wrong to
 * present this way, because each described one surface on one house and the
 * band reads as a general outcome. They are replaced with the two figures that
 * are true of the business rather than of one job.
 */
export const stats: Stat[] = [
  {
    // The suffix built '40 to 50%' from a value and a string, which is why a
    // text search for the old claim came up clean while the page still showed
    // it. Now the figure the supplied source actually supports.
    id: 'air-leakage',
    value: 40,
    suffix: '%',
    label: 'Of heating and cooling cost is air leakage',
    detail: 'Air leakage can account for as much as this. US Department of Energy, Building America Program.',
  },
  {
    // Rachael's wording (10 October 2026): the area, rounded, and no dollar
    // value. The contract value is not published anywhere on the site.
    id: 'contract',
    value: 30000,
    suffix: '+',
    unit: 'm²',
    label: 'Proven large-scale delivery',
    detail: 'Successfully completed under a single commercial contract.',
  },
  {
    id: 'experience',
    value: 3,
    suffix: '+',
    label: 'Decades of experience',
    detail: 'Spray-applied insulation since 1995. Based in Melbourne, working Australia-wide.',
  },
  {
    id: 'rigs',
    value: 5,
    label: 'Rigs and reactors',
    detail: 'Three vehicle-based spray rigs plus two non-vehicle reactors. Any size, any site.',
  },
]

/** The headline energy figure, used in the hero and the marquee. */
export const heroStat = {
  headline: 'Up to 40%',
  label: 'of heating and cooling cost is air leakage',
  detail: 'US Department of Energy, Building America Program.',
} as const
