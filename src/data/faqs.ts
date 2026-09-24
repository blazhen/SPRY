import type { SectionIntro } from '@/data/content'
import { faqIntro } from '@/data/content'

export interface Faq {
  id: string
  question: string
  answer: string
}

/** One FAQ section: its heading and the questions under it. */
export interface FaqSet {
  id: 'general' | 'residential' | 'commercial' | 'sprayFoam'
  intro: SectionIntro
  items: Faq[]
}

/**
 * Every answer here restates something the site already claims elsewhere, in
 * the page copy, the surface diagram or the foam comparison. Nothing is new
 * information, so nothing needs a source the rest of the site does not have.
 * Each page gets its own set, written for the question a reader of that page
 * has: none of these repeats across pages.
 */

/** Answers paraphrased from SprayIT's own technical content. On the homepage. */
export const faqs: Faq[] = [
  {
    id: 'r-value',
    question: 'What is R-Value?',
    answer:
      'R-value is the measure of a material’s thermal resistance: how well it resists heat moving through it. The higher the R-value, the slower heat escapes in winter and enters in summer. It is the number the industry quotes most, but on its own it only describes one third of how an insulation system actually performs.',
  },
  {
    id: 'air-permeance',
    question: 'How does spray foam help with air permeance?',
    answer:
      'Air permeance is how readily air passes through a building element. Because spray foam is applied wet and expands to fill every gap, join and irregular cavity before it cures, it forms one continuous air barrier rather than a series of separate pieces. That removes the leakage paths around and between traditional batts, which is why customers notice drafts disappearing almost immediately.',
  },
  {
    id: 'vapour-permeance',
    question: 'Does it help with vapour permeance?',
    answer:
      'Vapour permeance describes how much water vapour can pass through a material. It matters because trapped moisture causes condensation, mould and material decay. Some spray foams are deliberately vapour-permeable so the structure can still breathe, while closed-cell products act as a vapour retarder. We specify the right foam for the substrate and the conditions rather than applying one product everywhere.',
  },
  {
    id: 'effectiveness',
    question: 'How do you actually measure insulation effectiveness?',
    answer:
      'Effective insulation is about more than R-value alone. Real-world performance depends on the insulation’s R-value, how continuously and completely it is installed, how well it controls unwanted air movement, and how the overall wall or roof system manages moisture and vapour. Even a high R-value product can perform poorly if gaps, voids or air leakage allow heat to bypass the insulation. For this reason, insulation should be assessed as part of the complete building envelope, not simply by comparing R-values.',
  },
]

export const faqSets: Record<FaqSet['id'], FaqSet> = {
  general: { id: 'general', intro: faqIntro, items: faqs },

  residential: {
    id: 'residential',
    intro: {
      eyebrow: 'Questions',
      headingLines: ['FAQs about', 'residential', 'insulation.'],
      accentWord: 'residential',
    },
    items: [
      {
        id: 'res-retrofit',
        question: 'Can you insulate the walls of an existing home without pulling them apart?',
        answer:
          'Yes. In an existing brick veneer home the cavity is filled from outside through small access points, so nothing internal is disturbed and nobody has to move out. The access points are made good afterwards. In a new build the foam goes between the studs before the walls are lined.',
      },
      {
        id: 'res-first',
        question: 'Which part of the house should we insulate first?',
        answer:
          'In most homes around a third of the heat is lost through the roof, around a quarter through the walls and the rest through the floor. If you can only do one, the roof is usually the biggest single gain. But insulating one surface and leaving the others helps less than people expect, because heating and cooling take whichever path is still open.',
      },
      {
        id: 'res-underfloor',
        question: 'Do you insulate under a suspended timber floor?',
        answer:
          'Yes, and it is the surface almost everybody skips. A suspended timber floor sits above open, moving air, which is exactly why the floor is cold in July and why insulating the roof alone never quite fixes the room. The foam is sprayed to the underside of the floor, between the joists, from the subfloor.',
      },
      {
        id: 'res-penetrations',
        question: 'What happens around downlights, flues and wiring in the roof?',
        answer:
          'We insulate around roof and ceiling penetrations while keeping all the required clearances around downlights, flues and electrical equipment. It is part of every roof job, not an extra.',
      },
      {
        id: 'res-after',
        question: 'What changes once the house is done?',
        answer:
          'The first thing owners report is not a number on a bill. It is that the house holds its temperature: one temperature room to room, warm for hours after the heating goes off, and no draft crossing the floor. The bill follows, because the heating cycles less often and runs at a lower setting to reach the same comfort.',
      },
      {
        id: 'res-older',
        question: 'Does it suit older homes?',
        answer:
          'Older housing is where it pays off hardest. Pre-1990 homes in Victoria usually have no insulation at all in the walls or the subfloor, and many have too little in the ceiling. Those are the houses where the difference is felt in the first week.',
      },
    ],
  },

  commercial: {
    id: 'commercial',
    intro: {
      eyebrow: 'Questions',
      headingLines: ['FAQs about', 'commercial', 'insulation.'],
      accentWord: 'commercial',
    },
    items: [
      {
        id: 'com-shutdown',
        question: 'Do we have to shut the facility down while you spray?',
        answer:
          'Usually not for longer than the job itself needs. We work in operating buildings, spraying roof and wall systems around plant and services, and we plan the sequence with you so the line stops for as little time as possible.',
      },
      {
        id: 'com-scale',
        question: 'How big a job can you take on?',
        answer:
          'Our largest single contract was $3.44 million, covering 30,863 square metres on one project. Three vehicle-based rigs and two standalone reactors mean we can put a full application setup on a site with no power, no shelter and no road access for a standard truck. Large spans are sprayed continuously rather than in patches.',
      },
      {
        id: 'com-spec',
        question: 'Can you work to a specification?',
        answer:
          'Yes, and we are comfortable being held to one. We work directly with builders, facility managers and project engineers. Product selection, thickness and coating system are documented against what the building has to achieve, not against what happens to be on the truck.',
      },
      {
        id: 'com-cold',
        question: 'Why is spray foam used on cold storage and processing plants?',
        answer:
          'Because commercial insulation is rarely about comfort. It is about holding a temperature, protecting a product, or stopping condensation destroying a structure. Closed cell foam on controlled-temperature storage means every degree held is money not spent on refrigeration.',
      },
      {
        id: 'com-subcontract',
        question: 'Do you subcontract the application?',
        answer:
          'No. We apply it ourselves, with our own rigs and our own applicators, so the crew on site is accountable for the result. On multi-stage projects that is usually the difference between a program that holds and one that does not.',
      },
      {
        id: 'com-sheeting',
        question: 'Can it go straight onto the sheeting of a shed?',
        answer:
          'Yes. On sheds, wineries and packing floors it is applied straight onto the sheeting with no framing required, in working buildings that cannot afford a long shutdown.',
      },
    ],
  },

  sprayFoam: {
    id: 'sprayFoam',
    intro: {
      eyebrow: 'Questions',
      headingLines: ['FAQs about', 'spray foam', 'itself.'],
      accentWord: 'spray foam',
    },
    items: [
      {
        id: 'sf-open-closed',
        question: 'What is the difference between open cell and closed cell foam?',
        answer:
          'Open cell foam expands a long way as it cures, so it fills deep cavities economically, stays flexible and lets vapour through, which suits a structure that needs to breathe. Closed cell expands less and cures dense and rigid: it gives the highest insulation value where depth is limited, resists water and vapour, and suits cold and wet exposure. It costs more, and earns it where the job demands it.',
      },
      {
        id: 'sf-batts',
        question: 'How is spray foam different from batts?',
        answer:
          'Batts are cut pieces fitted into an imperfect building, so every edge, corner and pipe penetration is a path for air. Spray foam arrives as a liquid and expands on contact, curing into one continuous layer bonded to the structure. There are no edges, no joins and no gap where a pipe or a downlight passes through.',
      },
      {
        id: 'sf-same-r',
        question: 'If two products have the same R-value, do they perform the same?',
        answer:
          'Not once the wind gets up. A building loses heat three ways: conduction, convection and air leakage, and a rated R-value only describes the first. Because foam cures as one continuous layer, it deals with all three at once, which is why two buildings insulated to the same number on paper can behave nothing like each other.',
      },
      {
        id: 'sf-settle',
        question: 'Does spray foam settle or sag over time?',
        answer:
          'No. It cures hard and bonded to the substrate, so there is no settling over time and no gap opening up at a join, which is what happens to cut insulation as a building moves and ages.',
      },
      {
        id: 'sf-coatings',
        question: 'Where do polyurea and aliphatic coatings come in?',
        answer:
          'Foam that stays exposed to the weather, on a roof for example, is protected with a coating over the top. We apply polyurea and aliphatic coating systems, and acrylic roof coatings, as part of the same job: the foam does the insulating and the coating takes the sun and the rain.',
      },
    ],
  },
}
