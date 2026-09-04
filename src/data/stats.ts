export interface Stat {
  id: string
  /** Number the count-up animates to. */
  value: number
  /** Rendered before the number, e.g. a plus. */
  prefix?: string
  /** Rendered after the number, e.g. % or +. */
  suffix?: string
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
    id: 'efficiency',
    value: 40,
    suffix: ' to 50%',
    label: 'More efficient in the real world',
    detail: 'Compared with traditional insulation at the same rated R-value.',
  },
  {
    id: 'contract',
    value: 3.44,
    prefix: '$',
    suffix: 'M',
    decimals: 2,
    label: 'Largest single contract',
    detail: 'One project, 30,863 square metres under a single contract.',
  },
  {
    id: 'experience',
    value: 3,
    suffix: '+',
    label: 'Decades of experience',
    detail: 'Family-owned and operated in Victoria, working Australia-wide.',
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
  headline: '40 to 50%',
  label: 'more efficient in the real world',
  detail: 'Compared with traditional insulation at the same rated R-value.',
} as const
