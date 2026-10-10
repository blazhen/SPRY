import type { SectionIntro } from '@/data/content'
import { faqIntro } from '@/data/content'

export interface Faq {
  id: string
  question: string
  answer: string
}

/** One FAQ section: its heading and the questions under it. */
export interface FaqSet {
  id: 'general' | 'residential' | 'commercial' | 'sprayFoam' | 'underfloor' | 'roof' | 'walls'
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

  /* The agency's own ten, from their residential outline, as written. The last
     four were in title case in the draft and are set in sentence case here
     to match the first six. */
  residential: {
    id: "residential",
    intro: {
      eyebrow: "Questions",
      headingLines: [
        "Spray Foam FAQs"
      ],
      accentWord: "FAQs"
    },
    items: [
      {
        id: "res-older",
        question: "Is spray foam suitable for older homes?",
        answer: "It can suit some older properties, depending on the construction, existing materials, and access. We recommend an assessment before deciding on the appropriate application."
      },
      {
        id: "res-renovations",
        question: "Can spray foam be used during renovations?",
        answer: "Yes. Renovations can provide access to areas that may otherwise be difficult to reach. Suitability depends on the area being renovated and the existing structure."
      },
      {
        id: "res-parts",
        question: "Which parts of my home can be insulated?",
        answer: "SprayIT Solutions provides suitable residential applications for underfloor, roof and ceiling, and wall areas. Available options depend on your home’s construction and access."
      },
      {
        id: "res-comfort",
        question: "Can insulation improve indoor comfort?",
        answer: "Effective insulation can reduce unwanted heat transfer, which may help maintain more stable, comfortable indoor temperatures."
      },
      {
        id: "res-draughts",
        question: "Does spray foam help reduce draughts?",
        answer: "Spray foam expands into suitable gaps and spaces, helping form an air barrier in the treated area. This can reduce unwanted air movement where gaps are contributing to draughts."
      },
      {
        id: "res-moisture",
        question: "Can spray foam fix moisture or condensation problems?",
        answer: "Spray foam should not be used to conceal or compensate for an active leak, drainage problem, or persistently damp substrate. Ventilation, temperature, building design, and water ingress can all affect moisture and condensation. The underlying cause should be investigated before insulation is installed. Different foam systems also have different vapour and moisture characteristics, so the right product must be selected for specific application."
      },
      {
        id: "res-time",
        question: "How long does spray foam take to install?",
        answer: "Installation time depends on the size and condition of the area, access and the complexity of the project. A site assessment can provide a more accurate timeframe."
      },
      {
        id: "res-new",
        question: "Is spray foam suitable for new homes?",
        answer: "Spray foam can be considered for suitable areas of new homes. Construction can also provide easier access to areas that may become harder to reach once the property is completed."
      },
      {
        id: "res-energy",
        question: "Can home insulation help reduce energy use?",
        answer: "Effective insulation can reduce heat transfer and may reduce the heating or cooling needed to maintain indoor comfort. Actual energy use varies between homes."
      },
      {
        id: "res-choose",
        question: "How do I choose the right home insulation?",
        answer: "The right option depends on the area being insulated, the existing construction, access and the home’s thermal requirements. A professional assessment can help identify a suitable approach."
      }
    ]
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
          'We have completed more than 30,000 square metres under a single commercial contract. Three vehicle-based rigs and two standalone reactors mean we can put a full application setup on a site with no power, no shelter and no road access for a standard truck. Large spans are sprayed continuously rather than in patches.',
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

  /* One set per service page, each written for that page. None repeats another page. */
  underfloor: {
    id: "underfloor",
    intro: {
      eyebrow: "Questions",
      headingLines: [
        "FAQs about",
        "underfloor insulation."
      ],
      accentWord: "underfloor"
    },
    items: [
      {
        id: "uf-why",
        question: "Why insulate under the floor?",
        answer: "Because the floor is often the coldest surface in an older home and the one left uninsulated. Sealing it from below stops the draught between the boards, keeps warmth in the room and means the heating works less hard to reach the same comfort."
      },
      {
        id: "uf-space",
        question: "How much space do you need under the floor?",
        answer: "As a guide, at least 400mm of clear space below the floor, so the crew can reach every part of it safely. If your subfloor is tighter than that, ring us and we will tell you honestly whether it can be done."
      },
      {
        id: "uf-batts",
        question: "Is spray foam better than underfloor batts or foil?",
        answer: "Batts and foil are cut to fit and held up with supports, so they leave gaps at the joists and can drop over time. Spray foam bonds to the underside of the floor and fills the gaps between the boards, so it seals the floor as well as insulating it, and it stays in place for the life of the building."
      },
      {
        id: "uf-draught",
        question: "Will it stop the draught coming up through the floorboards?",
        answer: "Yes, and it is usually the first thing people notice. The foam seals the gaps between the boards from below, so outside air can no longer come up through them."
      },
      {
        id: "uf-move-out",
        question: "Do we have to move out while you spray?",
        answer: "No. The area being sprayed is kept clear of people and pets while we work, and the space needs some time before it is used again. Depending on the foam that is anywhere from about an hour to a full day, and the crew will tell you which applies."
      },
      {
        id: "uf-damp",
        question: "What if the subfloor is damp?",
        answer: "We check the subfloor before recommending a foam. Foam should never cover up a leak, a drainage problem or a subfloor with no ventilation, so the cause is found and fixed first."
      }
    ]
  },

  roof: {
    id: "roof",
    intro: {
      eyebrow: "Questions",
      headingLines: [
        "FAQs about roof",
        "and ceiling insulation."
      ],
      accentWord: "roof"
    },
    items: [
      {
        id: "rc-existing",
        question: "Can you insulate an existing roof without replacing it?",
        answer: "Usually, yes. Where we can reach the underside of the roof or the ceiling space, foam is applied to an existing roof without major renovation. Where access is tight, we will tell you what is possible before quoting."
      },
      {
        id: "rc-where",
        question: "Should the foam go under the roof or on the ceiling?",
        answer: "It depends on how the roof is built, whether the roof space is used, and how it is ventilated. We look at the roof first and recommend the approach that suits it."
      },
      {
        id: "rc-penetrations",
        question: "What happens around downlights, flues and wiring?",
        answer: "We insulate around roof and ceiling penetrations while keeping all the required clearances around downlights, flues and electrical equipment. It is part of every roof job, not an extra."
      },
      {
        id: "rc-last",
        question: "How long does spray foam in a roof last?",
        answer: "It is designed to last the life of the building. It cures hard and bonded to the surface, so it does not sag, shift or settle the way batts do."
      },
      {
        id: "rc-summer",
        question: "Does it help in summer as well as winter?",
        answer: "Yes. The roof is where most heat comes in on a hot day as well as where it escapes on a cold night, so sealing it helps the house hold its temperature in both seasons."
      },
      {
        id: "rc-curved",
        question: "Can spray foam go on a curved or unusual roof?",
        answer: "Yes. Because it is sprayed rather than cut, it follows curves, angles and awkward spaces that cut insulation cannot. Our photo gallery has a curved roof in Cremorne done exactly that way."
      }
    ]
  },

  walls: {
    id: "walls",
    intro: {
      eyebrow: "Questions",
      headingLines: [
        "FAQs about wall",
        "and retrofit insulation."
      ],
      accentWord: "retrofit"
    },
    items: [
      {
        id: "wl-linings",
        question: "Can you insulate walls without removing the plasterboard?",
        answer: "Yes, where the cavity suits it. InjectaCore is installed through small access points, so the internal linings stay in place, and the access points are made good afterwards."
      },
      {
        id: "wl-injectacore",
        question: "What is InjectaCore?",
        answer: "A specialist injection-foam insulation system for existing wall cavities. It is installed through small access points, without needing the entire wall lining to be removed, which is what makes it possible to insulate a wall that is already built."
      },
      {
        id: "wl-suitable",
        question: "Which walls are suitable?",
        answer: "It depends on the construction and the cavity. Brick veneer and weatherboard homes with clear cavities are usually good candidates. Cavities that are blocked, damp or too narrow may not be, and we check before quoting."
      },
      {
        id: "wl-occupied",
        question: "Do we need to move out for retrofit wall insulation?",
        answer: "No. It is done with the house lived in. The rooms being worked on need to be clear while we are in them."
      },
      {
        id: "wl-open",
        question: "Can you spray the walls while the frame is open?",
        answer: "Yes. In a new build or a renovation, foam is sprayed between the studs before the lining goes on. It fills the cavity flush to the frame and seals around pipes and wiring."
      },
      {
        id: "wl-noise",
        question: "Will wall insulation make the house quieter?",
        answer: "Filling the cavity reduces the sound travelling through the wall, so most homes are noticeably quieter, particularly on a busy road or between a bedroom and a living area."
      }
    ]
  },
}
