import type { SectionIntro } from '@/data/content'

/**
 * R-value explainer content, and the gate on its headline number.
 *
 * WHY THERE IS A GATE HERE
 *
 * The brief is to counter a competitor's misleading claims by being more
 * credible than they are. That only works if our own numbers survive scrutiny.
 * Under Australian Consumer Law a specific performance claim has to be
 * substantiable, and the ACCC can require the evidence on request.
 *
 * So the specific figure is withheld until two things are true: Glenn has
 * confirmed it, and a source has been recorded. Until then the section still
 * renders and still makes the argument, because the *mechanism* is not in
 * dispute and needs no substantiation: cut pieces leave gaps, gaps leak air,
 * and rated R-value only ever described conduction. What is withheld is the
 * number, not the story.
 *
 * TO PUBLISH THE FIGURE: fill in `source`, set `figuresApproved` to true.
 */
export const rvalueClaim = {
  /** Set true ONLY once Glenn has signed off and `source` is filled in. */
  figuresApproved: false,

  /**
   * Where the figure comes from. A test standard, a published study, or
   * Glenn's own measured job data. Must not be empty when approved.
   */
  source: '',

  /** The rating both products carry on paper. */
  ratedValue: 'R2.5',

  /** The claimed real-world advantage. Only rendered once approved. */
  realWorldGain: { low: 40, high: 50, unit: '%' },
}

export const rvalueIntro: SectionIntro = {
  eyebrow: 'R-value, honestly',
  headingLines: ['Same number.', 'Different building.'],
  accentWord: 'Different',
  lede: 'Two products can carry an identical R-value and behave nothing alike once they are installed. The rating describes the material on a test bench, not the wall you end up with.',
}

export const rvalueCopy = {
  ratedLabel: 'What the label measures',
  ratedBody:
    'R-value measures resistance to heat moving through a material by conduction. It is measured on a flat, perfect, uninterrupted sample. Nothing in that test involves a stud, a pipe, a downlight, an untidy edge or wind.',

  realLabel: 'What the building does',
  realBody:
    'A real wall has all of those. Cut pieces leave edges, edges leave gaps, and air moves through gaps carrying heat with it. That path is not in the rating at all, which is why two walls rated the same can feel completely different.',

  /** Shown in place of the number while the figure is unapproved. */
  pendingNote:
    'The measured performance difference is being confirmed with our own job data before we publish it.',

  batts: {
    title: 'Batts at ' + 'R2.5',
    points: [
      'Cut to fit an imperfect cavity',
      'Gaps at every edge and penetration',
      'Compresses and settles over time',
      'Air moves freely through the gaps',
    ],
  },
  foam: {
    title: 'Spray foam at ' + 'R2.5',
    points: [
      'Expands into the cavity it is sprayed into',
      'No edges, so no gaps to leak through',
      'Bonded to the substrate, does not settle',
      'Seals and insulates in one layer',
    ],
  },

  footnote:
    'Both products in this comparison carry the same rated R-value. The difference shown is about air movement and installation, not about the number on the bag.',
}
