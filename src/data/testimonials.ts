export interface Testimonial {
  id: string
  /** The customer's own words, lightly tidied. */
  quote: string
  name: string
  suburb: string
  /** What was insulated. Shown as a small tag on the card. */
  scope: string
  rating: 5
}

/** Real SprayIT customer feedback. Do not invent additions to this list. */
export const testimonials: Testimonial[] = [
  {
    id: 'paul-altona',
    quote:
      'Since the floor was insulated I set the heater two degrees lower and the house is just as comfortable. Our electricity use dropped about 14.5%, and it stays warm for hours after the heating goes off.',
    name: 'Paul',
    suburb: 'Altona',
    scope: 'Underfloor',
    rating: 5,
  },
  {
    id: 'marc-sherbrooke',
    quote:
      'Ours is an eighty-year-old home and the drafts are simply gone. The whole place now sits at one constant temperature and the ducted heating is far more efficient than it used to be.',
    name: 'Marc',
    suburb: 'Sherbrooke',
    scope: 'Whole home',
    rating: 5,
  },
  {
    id: 'deborah-colin-preston',
    quote:
      'We had the walls and the floor done. The temperature is even everywhere now: no fluctuations room to room, and it holds right through the night.',
    name: 'Deborah & Colin',
    suburb: 'Preston',
    scope: 'Walls & floor',
    rating: 5,
  },
  {
    id: 'goran-oakleigh',
    quote:
      'It stopped the drafts under the floor completely. The unexpected bonus was the noise: we are near the airport and it is noticeably quieter inside.',
    name: 'Goran',
    suburb: 'Oakleigh',
    scope: 'Underfloor',
    rating: 5,
  },
  {
    id: 'david-keilor',
    quote:
      'They sprayed the underside of the roof. The house retains its heat so much longer now, even with the heating switched off.',
    name: 'David',
    suburb: 'Keilor',
    scope: 'Roof & ceiling',
    rating: 5,
  },
  {
    id: 'trevor-gisborne',
    quote:
      'Much warmer underfoot and the floorboards have stopped squeaking. Honest quoting from the start: they told me exactly what it would cost and that is what I paid.',
    name: 'Trevor',
    suburb: 'Gisborne',
    scope: 'Underfloor',
    rating: 5,
  },
  {
    id: 'chris-devonport',
    quote:
      'Insulating the walls and floor transformed the house. Our first heating bill afterwards came in 25% lower than the same period the year before.',
    name: 'Chris',
    suburb: 'Devonport',
    scope: 'Walls & floor',
    rating: 5,
  },
]
