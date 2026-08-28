/**
 * Company-wide facts: contact details, navigation, SEO defaults.
 * Everything here is real SprayIT content. Treat as source of truth.
 */

export interface NavItem {
  /** Zero-padded index used by the mobile drawer (01, 02, …). */
  index: string
  label: string
  href: string
}

export interface SocialLink {
  label: string
  href: string
  icon: 'linkedin' | 'facebook' | 'instagram' | 'youtube'
}

export const site = {
  name: 'Spray It Solutions',
  shortName: 'SprayIT',
  tagline: 'The most effective & energy efficient insulation.',

  /** Positioning / capability line, used as the hero subhead. */
  capability:
    'Three custom-built vehicle-based spray rigs plus two non-vehicle reactors; applying open- and closed-cell polyurethane foams, polyurea and aliphatic coatings. Any size, any site.',

  founded: 'Family-owned, with decades of experience.',

  address: {
    line1: 'Factory 4, 114 Colemans Road',
    suburb: 'Carrum Downs',
    state: 'VIC',
    postcode: '3201',
    country: 'Australia',
    full: 'Factory 4, 114 Colemans Road, Carrum Downs, VIC 3201',
  },

  phone: {
    /** The one company number. Shown as-is everywhere. */
    display: '0428 26 36 26',
    tel: 'tel:+61428263626',
    /** E.164, for structured data only. Never rendered. */
    e164: '+61428263626',
  },

  email: 'info@sprayitsolutions.com.au',
  emailHref: 'mailto:info@sprayitsolutions.com.au',

  serviceArea: 'Melbourne, Victoria & Australia-wide',

  /**
   * Trading hours.
   *
   * REVIEW WITH GLENN before launch. These are plausible trade hours, not
   * confirmed ones. They matter more than they look: the phone assistant uses
   * them to decide between booking a call and offering a callback, and they
   * are published as structured data, so a wrong value sends people to a
   * closed office.
   */
  hours: {
    display: [
      { days: 'Monday to Friday', time: '7:00am to 5:00pm' },
      { days: 'Saturday', time: 'By appointment' },
      { days: 'Sunday', time: 'Closed' },
    ],
    note: 'Site work often starts earlier. If we do not pick up we are on the tools, so leave a message or book a call.',
    /** schema.org opening hours syntax. */
    schema: ['Mo-Fr 07:00-17:00'],
  },

  cta: {
    primary: { label: 'Request a Free Quote', href: '/contact' },
    secondary: { label: 'Call 0428 26 36 26', href: 'tel:+61428263626' },
  },

  credit: {
    label: 'Built by Systemations',
    href: 'https://systemations.ai',
  },
} as const

export const navItems: NavItem[] = [
  { index: '01', label: 'Home', href: '/' },
  { index: '02', label: 'About', href: '/about' },
  { index: '03', label: 'Spray Foam', href: '/spray-foam' },
  { index: '04', label: 'Residential', href: '/residential' },
  { index: '05', label: 'Commercial', href: '/commercial' },
  { index: '06', label: 'Contact', href: '/contact' },
]

/**
 * Real SprayIT profiles.
 *
 * Normalised on the way in: the LinkedIn URL drops its `/about/` tab so it
 * lands on the company home, and the Facebook URL drops the `mibextid` share
 * token, which is a per-share tracking parameter that expires and does not
 * belong in permanent markup.
 */
export const socialLinks: SocialLink[] = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/sprayit-solutions/',
    icon: 'linkedin',
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61563243716975',
    icon: 'facebook',
  },
  { label: 'Instagram', href: 'https://www.instagram.com/sprayit_solutions/', icon: 'instagram' },
  { label: 'YouTube', href: 'https://www.youtube.com/@SprayItSolutions', icon: 'youtube' },
]

/** Velocity-reactive marquee under the hero. */
export const marqueeItems: string[] = [
  'Superior Air Barrier',
  'Higher R-Value',
  '14.5% Less Energy',
  'Built to Last',
  'Any Size, Any Site',
]

export const seo = {
  title: 'Spray Foam Insulation Melbourne & Australia | Spray It Solutions',
  description:
    'Spray foam insulation across Melbourne and Australia: superior R-value, energy efficiency and air sealing. Get your free quote today.',
  canonical: 'https://www.sprayitsolutions.com.au/',
  ogImage:
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=75',
  locale: 'en_AU',
} as const
