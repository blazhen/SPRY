/**
 * Company-wide facts: contact details, navigation, SEO defaults.
 * Everything here is real SprayIT content. Treat as source of truth.
 */

export interface NavChild {
  label: string
  href: string
}

/** One service in the Services menu, with the pages grouped under it. */
export interface NavGroup {
  label: string
  href: string
  /** One line under the name in the desktop menu. */
  blurb: string
  children?: NavChild[]
}

export interface NavItem {
  /** Zero-padded index used by the mobile drawer (01, 02, …). */
  index: string
  label: string
  href: string
  /** Present on the Services entry: it opens a menu rather than a page. */
  groups?: NavGroup[]
}

export interface SocialLink {
  label: string
  href: string
  icon: 'linkedin' | 'facebook' | 'instagram' | 'youtube'
}

export const site = {
  name: 'Spray It Solutions',
  shortName: 'SprayIT',
  tagline: 'A premium and highly effective insulation solution.',

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

  serviceArea: 'Australia-wide',

  /**
   * Link to the full Google review listing.
   *
   * The testimonials on the site are chosen, not fed live, so that a single
   * poor review cannot appear unannounced on the homepage. That is a fair thing
   * to do only if the complete set is one click away, which is what this is.
   *
   * Empty means the link does not render at all. Never ship a dead one.
   *
   * The id in the middle is the Google listing for SprayIT Solutions (VIC)
   * Pty Ltd. The trailing !9m1!1b1 is what opens the Reviews tab rather than
   * the overview, which is the whole point of the link: a reader who clicks
   * Read all of our reviews should land on the reviews, not on a map.
   *
   * Everything else Google puts in that address is session state, including
   * map coordinates, a zoom level and an account id. All of it was tested off
   * and this is the shortest form that still lands on the reviews tab.
   */
  reviewsUrl:
    'https://www.google.com/maps/place/SprayIT+Solutions+(VIC)+Pty+Ltd/data=!4m4!3m3!1s0x6ad66d34e29e3fbb:0x2e675ad000ebab03!9m1!1b1',

  /**
   * The Google Business Profile listing itself, behind the address in the
   * footer and on the contact page. The cid is the listing's own id: the
   * decimal form of the hex id that reviewsUrl carries, so the two links can
   * never point at different places.
   */
  listingUrl: 'https://maps.google.com/?cid=3343741097761024771',

  /**
   * The map on the contact page. An address embed, which needs no API key.
   * The Business Profile's own embed (Share > Embed a map) pins the listing
   * rather than the street; paste its src here when it is to hand.
   */
  mapEmbedUrl:
    'https://www.google.com/maps?q=SprayIT%20Solutions%20(VIC)%20Pty%20Ltd%2C%20Factory%204%2C%20114%20Colemans%20Road%2C%20Carrum%20Downs%20VIC%203201&output=embed',

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
    /* One label, everywhere: header, hero, footer, the phone bar and the
       closing band all say the same thing. */
    primary: { label: 'Get a Free Quote', href: '/contact' },
    secondary: { label: 'Call 0428 26 36 26', href: 'tel:+61428263626' },
  },

  credit: {
    label: 'Built by Systemations',
    href: 'https://systemations.ai',
  },
} as const

/**
 * The Services menu: each service page with the work grouped under it.
 *
 * The sub-service links land on the section of the page that covers that
 * work, and on Residential they also preselect the matching surface on the
 * interactive house. They are the same links the footer uses, so the two
 * never disagree about where a service lives.
 */
export const servicesMenu: NavGroup[] = [
  {
    label: 'Spray Foam',
    href: '/spray-foam',
    blurb: 'How it works, open cell against closed cell, and why it beats batts.',
  },
  {
    label: 'Residential',
    href: '/residential',
    blurb: 'Homes, sheds and new builds: roof, walls and underfloor.',
    children: [
      { label: 'Underfloor', href: '/residential#underfloor' },
      { label: 'Roof & Ceiling', href: '/residential#roof' },
      { label: 'Wall', href: '/residential#walls' },
    ],
  },
  {
    label: 'Commercial',
    href: '/commercial',
    blurb: 'Factories, cold storage, farms, processing plants and mine sites.',
    children: [
      { label: 'Factory & Warehouse', href: '/commercial#industrial' },
      { label: 'Farming', href: '/commercial#agri' },
      { label: 'Mining', href: '/commercial#sectors' },
    ],
  },
]

/**
 * Home is deliberately absent. The logo is a link to it, labelled for screen
 * readers, and every site puts home behind the mark anyway. The three service
 * pages sit behind one Services entry, which is what gives the header room
 * for Gallery and Blog without crowding.
 */
export const navItems: NavItem[] = [
  { index: '01', label: 'About', href: '/about' },
  { index: '02', label: 'Services', href: '/spray-foam', groups: servicesMenu },
  { index: '03', label: 'Gallery', href: '/gallery' },
  { index: '04', label: 'Blog', href: '/blog' },
  { index: '05', label: 'Contact', href: '/contact' },
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
  'Seals Air Leakage',
  'Built to Last',
  'Any Size, Any Site',
]

export const seo = {
  title: 'Spray Foam Insulation Australia-wide | Spray It Solutions',
  description:
    'Spray foam insulation Australia-wide: a premium and highly effective insulation solution with superior real-world performance and air sealing. Get your free quote today.',
  canonical: 'https://www.sprayitsolutions.com.au/',
  ogImage:
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=75',
  locale: 'en_AU',
} as const
