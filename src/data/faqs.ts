export interface Faq {
  id: string
  question: string
  answer: string
}

/** Answers paraphrased from SprayIT's own technical content. */
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
