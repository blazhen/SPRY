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

/** Count-up band. Every figure here is drawn from real customer reporting. */
export const stats: Stat[] = [
  {
    id: 'energy',
    value: 14.5,
    suffix: '%',
    decimals: 1,
    label: 'Less electricity used',
    detail: 'Measured by a customer in Altona: 245.1 down to 210 KW per week.',
  },
  {
    id: 'heating-bill',
    value: 25,
    suffix: '%',
    label: 'Lower heating bill',
    detail: 'Chris in Devonport, first bill after insulating walls and floor.',
  },
  {
    id: 'experience',
    value: 3,
    suffix: '+',
    label: 'Decades of experience',
    detail: 'Family-owned and operated from Carrum Downs, Victoria.',
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
  headline: '14.5%',
  label: 'less electricity used',
  detail: 'Verified by a customer meter reading: 245.1 → 210 KW per week after insulating.',
  before: 245.1,
  after: 210,
  unit: 'KW/week',
} as const
