import type { SectionIntro } from '@/data/content'

/**
 * Phone consult booking page.
 *
 * One calendar, owned by GoHighLevel. The assistant books into the same one, so
 * nothing here should ever describe availability: the calendar is the only
 * thing allowed to state what is free.
 *
 * The consult is deliberately a phone call, not a site visit. Spray foam cannot
 * be quoted properly without seeing the building, but a rig should not be sent
 * across Melbourne before the job is qualified. The call qualifies, then a
 * human books the assessment.
 */
export const booking = {
  seoTitle: 'Book a Phone Call | Spray It Solutions',
  seoDescription:
    'Book a free 15 minute phone call with Spray It Solutions. Talk through your building, what needs insulating and what it is likely to cost.',

  intro: {
    eyebrow: 'Book a call',
    headingLines: ['Fifteen minutes', 'on the phone.'],
    accentWord: 'minutes',
    lede: 'Pick a time that suits and one of the family will call you. No sales script, no obligation, just a straight conversation about your building.',
  } satisfies SectionIntro,

  points: [
    {
      icon: 'clock' as const,
      title: 'Fifteen minutes, no obligation',
      body: 'Long enough to understand the job and tell you honestly whether spray foam is the right answer.',
    },
    {
      icon: 'phone' as const,
      title: 'We call you',
      body: 'You will get a confirmation and a reminder by SMS. Nothing to install and no meeting link to join.',
    },
    {
      icon: 'shield' as const,
      title: 'What happens next',
      body: 'If it looks like a fit, we book a site assessment to measure up and give you a firm quote.',
    },
  ],

  calendarTitle: 'Booking calendar for a phone call with Spray It Solutions',
  callInstead: 'Would rather just ring us? Call',

  fallbackTitle: 'Give us a call',
  fallbackBody:
    'Online booking is being set up. In the meantime the fastest way to get a time in the diary is to call us directly.',
} as const
