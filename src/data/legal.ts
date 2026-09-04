/**
 * Privacy policy content.
 *
 * Written to cover what this site and the CRM behind it actually do: web form
 * capture, SMS and email follow-up, phone calls that may be handled or recorded
 * by an automated assistant, and third-party analytics.
 *
 * STILL TO CONFIRM BEFORE LAUNCH. These now read as settled statements on the
 * page, so if any of them is wrong the policy is wrong:
 *  - the ABN, and whether an ACN also applies
 *  - who the privacy contact is, if not the general info address
 *  - whether calls are in fact recorded, and from which number
 *    ("Phone calls, SMS and email", third paragraph)
 *  - the real retention period ("How long we keep it")
 * This is a working draft prepared by the developer, not legal advice, and
 * should be read by whoever signs it off.
 */

export const privacyMeta = {
  title: 'Privacy Policy | Spray It Solutions',
  description:
    'How Spray It Solutions collects, uses and protects your personal information, including SMS, phone and website data.',
  /** Update whenever the policy text changes. */
  lastUpdated: '18 August 2026',
}

export interface PolicySection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export const policySections: PolicySection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      'Spray It Solutions is a family-owned insulation contractor based at Factory 4, 114 Colemans Road, Carrum Downs, Victoria 3201, operating Australia-wide.',
      'We handle personal information in line with the Privacy Act 1988 (Cth) and the Australian Privacy Principles. This policy explains what we collect, why, and what you can ask us to do about it.',
    ],
  },
  {
    heading: 'What we collect',
    paragraphs: ['We only collect what we need to quote and carry out work:'],
    bullets: [
      'Your name, phone number and email address.',
      'The postcode and address of the property to be insulated.',
      'Details about the job: property type, what needs insulating, stage and timeframe.',
      'Anything you choose to tell us in a message, chat or phone call.',
      'Website data: the pages you visit, the site or advertisement that referred you, and standard technical information such as browser and approximate location.',
    ],
  },
  {
    heading: 'How we use it',
    paragraphs: [
      'To respond to your enquiry, prepare a quote, schedule a call or site visit, carry out the work, and keep records we are required to keep.',
      'If you have given us permission, we also use your contact details to send occasional updates about our services and offers. That permission is separate from your enquiry, and you can withdraw it at any time.',
    ],
  },
  {
    heading: 'Phone calls, SMS and email',
    paragraphs: [
      'When you make an enquiry, you are consenting to us contacting you about that enquiry by phone, SMS or email. This is the ordinary follow-up any tradesperson does and it is not marketing.',
      'Marketing messages are different. We only send them if you have separately opted in, every message identifies us as the sender, and every message includes a way to stop. You can reply STOP to any SMS or use the unsubscribe link in any email, and we will action it promptly.',
      'Some calls to and from our business number may be recorded for quality and record-keeping purposes. Where a call is recorded you will be told at the start of the call, and you can ask us not to record.',
    ],
  },
  {
    heading: 'Automated assistants',
    paragraphs: [
      'We use automated systems to help answer calls and messages promptly, including outside business hours. If you are speaking or messaging with an automated assistant rather than a person, you will be told so, and you can ask to be put through to a member of the family at any point.',
      'Anything you share with an assistant is stored in the same customer record a staff member would use, and is treated exactly the same way as the rest of your information under this policy.',
    ],
  },
  {
    heading: 'Who we share it with',
    paragraphs: [
      'We do not sell your personal information. We share it only with the service providers who help us run the business, and only so far as they need it:',
    ],
    bullets: [
      'Our customer management, messaging and booking platform, which stores your contact record and sends our SMS and email.',
      'Analytics and advertising providers, including Google and Meta, which help us understand how the site is used and measure our advertising.',
      'YouTube, which serves the videos embedded on this site. Videos are only loaded once you press play.',
      'Suppliers or subcontractors where a job genuinely requires it, and only the details needed to complete the work.',
    ],
  },
  {
    heading: 'Cookies and tracking',
    paragraphs: [
      'This site stores small amounts of data in your browser to remember your preferences and to record how you first arrived, so we can tell which advertising is working. Analytics and advertising providers may also set cookies.',
      'You can block or clear cookies in your browser settings. The site will still work, though we will not be able to attribute your enquiry to the campaign that brought you here.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'We keep customer and job records for seven years, which reflects our tax and warranty obligations. Enquiries that do not become jobs are kept for two years, then deleted. Marketing consent records are kept for as long as you remain subscribed and for a reasonable period afterwards, as evidence that consent was given.',
    ],
  },
  {
    heading: 'Keeping it safe',
    paragraphs: [
      'We hold your information in reputable, access-controlled systems and limit access to the people who need it. No system is perfectly secure, but if a data breach were likely to cause you serious harm we would notify you and the Office of the Australian Information Commissioner as required.',
    ],
  },
  {
    heading: 'Your rights',
    paragraphs: [
      'You can ask us for a copy of the information we hold about you, ask us to correct it if it is wrong, ask us to delete it where we are not required to keep it, and withdraw your marketing consent at any time.',
      'Contact us using the details below and we will respond within a reasonable time. If you are not satisfied with how we have handled a privacy matter, you can complain to the Office of the Australian Information Commissioner at oaic.gov.au.',
    ],
  },
]
