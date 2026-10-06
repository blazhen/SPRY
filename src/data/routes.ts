/**
 * Every page address on the site, in one place.
 *
 * The addresses are the ones the old WordPress site already has, trailing
 * slash and all, wherever the page existed there. That is deliberate: those
 * URLs carry the search rankings and the agency's on-page work, and the host
 * the site is going to does not reliably apply server redirects. A page that
 * keeps its address needs no redirect at all.
 *
 * Pages that are new to this site (the booking page and the confirmation
 * pages) take the same trailing-slash form so every internal link reads the
 * same way. Blog articles sit at the root, as they did on WordPress.
 *
 * Link with these, never with a typed string, so an address can only ever
 * be wrong in one place.
 */
export const routes = {
  home: '/',
  about: '/about-us/',
  sprayFoam: '/what-is-spray-foam/',
  residential: '/residential/',
  underfloor: '/services/under-floor-insulation/',
  roofCeiling: '/services/insulation-for-roof-and-ceiling/',
  walls: '/services/wall-insulation/',
  commercial: '/commercial/',
  gallery: '/photo-gallery/',
  blog: '/blog/',
  contact: '/contact-us/',
  book: '/book/',
  privacy: '/privacy-policy/',
  thanksQuote: '/thanks/quote/',
  thanksBooked: '/thanks/booked/',
} as const

/** A blog article, at the root like the old site. */
export const postPath = (slug: string) => `/${slug}/`

/** The canonical host: no www, https. */
export const SITE_ORIGIN = 'https://sprayitsolutions.com.au'

/** Compare two paths regardless of a trailing slash or a hash. */
export const samePath = (a: string, b: string) => {
  const clean = (p: string) => p.split('#')[0].replace(/\/+$/, '') || '/'
  return clean(a) === clean(b)
}

/**
 * Old addresses and where they go now.
 *
 * Two kinds: the WordPress pages that were folded into another page, and the
 * addresses the staging site used before the URLs were matched to the live
 * site (the assistant, the CRM messages and earlier documents link to some
 * of them). The host's redirect file is generated from this list at build
 * time, and the app applies the same list in the browser as a fallback for
 * hosts that ignore the file. One list, so the two can never disagree.
 *
 * A trailing `*` matches anything under that prefix.
 */
export const legacyRedirects: Array<[from: string, to: string]> = [
  // Staging addresses, before the URLs were matched to the live site
  ['/about', routes.about],
  ['/contact', routes.contact],
  ['/privacy', routes.privacy],
  ['/gallery', routes.gallery],
  ['/spray-foam', routes.sprayFoam],

  // WordPress pages folded into another page
  ['/home', routes.home],
  ['/thank-you', routes.thanksQuote],
  ['/spray-foam-insulation-system', routes.sprayFoam],
  ['/faq', routes.sprayFoam + '#faq'],
  ['/fact-sheets', routes.gallery + '#fact-sheets'],
  ['/video-gallery', routes.gallery],
  ['/media-gallery', routes.gallery],
  ['/retrofit', routes.walls],
  ['/retrofit-insulation', routes.walls],
  ['/services/factory', routes.commercial + '#industrial'],
  ['/services/farming', routes.commercial + '#agri'],
  ['/services/mining', routes.commercial + '#mining'],
  ['/services', routes.residential],
  ['/blog-2/open-cell-spray-foam-facts', routes.sprayFoam],
  ['/blog-2', routes.blog],
  ['/category/*', routes.blog],
]
