export interface Testimonial {
  id: string
  /**
   * The customer's own words.
   *
   * Trimmed for length, and tidied only for typing slips a customer made while
   * writing to Glenn: a missing apostrophe, "rather then" for "rather than",
   * "droughts" for "draughts", SHOUTED words put back into sentence case.
   * Nothing is reworded, nothing is added, and no clause is ever moved from one
   * customer to another.
   */
  quote: string
  name: string
  suburb: string
  /** What was insulated, as that customer's own caption states it. */
  scope: string
}

/**
 * Real SprayIT customer feedback, taken from the testimonials the client
 * publishes on sprayitsolutions.com.au.
 *
 * READ THIS BEFORE EDITING. An earlier version of this file paraphrased these
 * testimonials, and in four of the seven cards the paraphrase carried words
 * that belonged to a different customer: Deborah and Colin's constant
 * temperature line appeared under Marc's name, David's airport noise appeared
 * under Goran's, and so on. Every one of these is a real named person. Putting
 * words in their mouth is not a copy decision, it is a false statement about
 * someone who can read the page and who never said it.
 *
 * So the rule for this file: quote, attribute, or leave out. Never invent, and
 * never improve. If a quote is too long for the card, cut from the end rather
 * than rewrite the middle.
 *
 * The client publishes two further testimonials that are deliberately not used
 * here: Catherine and Paul from Mt Waverley, whose caption is cut off at "had
 * the floor and..", and one published with no name at all. Both are real and
 * both are available, but neither can be captioned completely from what the
 * client has published, and the client has not been asked to fill the gaps.
 * Add them only once that detail exists.
 */
export const testimonials: Testimonial[] = [
  {
    id: 'paul-altona',
    quote:
      "It's been a great improvement. We have now been able to have the heater set to 20.0, rather than 22.5, and the room feels the same even though the temp is set lower. With our sophisticated electricity monitoring system, I can confidently state that we are using on average 14.5% less electricity.",
    name: 'Paul',
    suburb: 'Altona',
    scope: 'Underfloor',
  },
  {
    id: 'marc-sherbrooke',
    quote:
      "You were right, it's a huge improvement in our house. Really the big thing is so much less air movement. Now we go out, turn the heater off, and when we come back even hours later it's still warm inside. Can't wait to get the walls done.",
    name: 'Marc',
    suburb: 'Sherbrooke',
    scope: 'Underfloor',
  },
  {
    id: 'deborah-colin-preston',
    quote:
      "Our 80 year old home has always been difficult to heat. We had so many drafts and cold air coming in from places you couldn't even see, but certainly feel. Now that the process is complete we can honestly say that the difference is amazing. We have one constant temperature throughout the house and no more drafts. The ducted heating is working more efficiently.",
    name: 'Deborah & Colin',
    suburb: 'Preston',
    scope: 'Walls & floor',
  },
  {
    id: 'goran-oakleigh',
    quote:
      'We got great support from Glenn from SprayIT Solutions, starting from the quote. He was taking care of our specific needs and was flexible to make this insulation project affordable to us. Now we see benefits from insulation, and infrared camera assessment verified that R values were delivered as promised.',
    name: 'Goran',
    suburb: 'Oakleigh',
    scope: 'Underfloor',
  },
  {
    id: 'david-keilor',
    quote:
      'At least now I am confident that I made the right decision choosing a spray in foam system. Not only does it insulate well against the heat and cool, but in my opinion it solves the most overlooked feature, in that it stops the draughts so the heat stays where it is meant to. An added bonus for us was the reduction in noise as we live quite close to an airport.',
    name: 'David',
    suburb: 'Keilor',
    scope: 'Roof & ceiling',
  },
  {
    id: 'trevor-gisborne',
    quote:
      "Thanks for a great job, your and your son's professionalism and communication. The floor to touch was a lot warmer underfoot, no more squeaks and not as echoey. Rooms that are not heated were a lot more temperate too. Thanks also for your honesty in the size of the job, that quality seems to be a rarity nowadays.",
    name: 'Trevor',
    suburb: 'Gisborne',
    scope: 'Underfloor',
  },
  {
    id: 'chris-devonport',
    quote:
      "We have an early 50's brick veneer house and had the underfloor and 1st story walls foamed. It has transformed our house. The biggest gain is the drafts down the veneer walls. The first heating bill this year was 25% less than the year before, and we have to run the heat pumps at lower temperatures now, so we are very happy.",
    name: 'Chris',
    suburb: 'Devonport',
    scope: 'Walls & floor',
  },
]
