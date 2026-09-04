import type { LucideIcon } from 'lucide-react'
import { Wind, Gauge, Zap, PiggyBank, Blend, ShieldCheck } from 'lucide-react'

export interface Benefit {
  id: string
  title: string
  body: string
  icon: LucideIcon
  /** Optional short metric shown as an over-sized figure on the card. */
  figure?: string
}

/** The six selling points, in the order SprayIT leads with them. */
export const benefits: Benefit[] = [
  {
    id: 'air-barrier',
    title: 'Superior air barrier',
    body: 'Spray foam expands on contact and cures into one continuous, sealed skin that closes the gaps, joins and penetrations batts simply bridge over.',
    icon: Wind,
  },
  {
    id: 'r-value',
    title: 'Higher real-world R-value',
    body: 'Batts are rated in a lab. Foam performs in your building: no sagging, no settling, no compressed corners quietly costing you rated performance.',
    icon: Gauge,
  },
  {
    id: 'energy',
    title: 'Increased energy efficiency',
    body: 'Less air leakage means your heating and cooling runs shorter and holds longer. One customer measured 14.5% less electricity in the weeks after, applied to subfloor only.',
    icon: Zap,
    figure: '14.5%',
  },
  {
    id: 'cost',
    title: 'Cost-effective long term',
    body: 'A one-off install that keeps returning value every season it is in the building, and does not need replacing when it ages.',
    icon: PiggyBank,
  },
  {
    id: 'flexibility',
    title: 'Fills what batts cannot',
    body: 'Foam expands to fill oddly-shaped cavities, tight subfloors, irregular rooflines and awkward penetrations: the exact places heat escapes.',
    icon: Blend,
  },
  {
    id: 'durability',
    title: 'Built to last',
    body: 'Spray foam applied correctly will last the lifetime of the building. No sagging, no settling, and nothing to replace as it ages.',
    icon: ShieldCheck,
  },
]
