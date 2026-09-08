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
 * APPROVED, then corrected. Glenn instructed publication of a 40 to 50%
 * efficiency gain against traditional insulation, and supplied a US Department
 * of Energy statement as the evidence. That statement says something different:
 * air leakage can account for as much as 40% of the energy cost of heating and
 * cooling a home. It measures the problem, not the advantage over another
 * product, its baseline is a leaky house rather than a batt-insulated one, and
 * 40% is its ceiling, so nothing in it reaches 50%.
 *
 * The claim on the site is now the one the source supports, stated in the
 * source's own terms and cited on the page.
 */
export const rvalueClaim = {
  /** Approved by Glenn, client revision V1, 31 August 2026. */
  figuresApproved: true,

  /** Named on the page, because a cited number is the only kind worth printing. */
  source: 'US Department of Energy, Building America Program',

  /** The rating both products carry on paper. */
  ratedValue: 'R2.5',

  /**
   * The share of a home's heating and cooling cost that air leakage can reach.
   * A ceiling, which is why it is rendered as "as much as" and never as a range
   * running past it.
   */
  airLeakageShare: { max: 40, unit: '%' },
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
    'R-value measures resistance to heat moving through a material by conduction. It is measured on a flat, perfect, uninterrupted sample in a sealed piece of test equipment. Nothing in that test involves a stud, a pipe, a downlight, or wind.',

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
      'Closes the air path a rated R-value never described',
    ],
  },

  footnote:
    'Both products in this comparison carry the same rated R-value. The difference shown is about air movement and installation, not about the number on the bag.',
}
