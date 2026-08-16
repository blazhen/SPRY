import { Helmet } from 'react-helmet-async'
import { seo, site, socialLinks } from '@/data/site'

interface SeoProps {
  title?: string
  description?: string
  /** Path relative to the site root, e.g. `/residential`. */
  path?: string
  image?: string
  /** Emit the LocalBusiness structured data (homepage only). */
  structuredData?: boolean
}

/**
 * Per-route document head. Defaults come from `src/data/site.ts` so the
 * homepage values are the single source of truth.
 */
export default function Seo({
  title = seo.title,
  description = seo.description,
  path = '/',
  image = seo.ogImage,
  structuredData = false,
}: SeoProps) {
  const canonical = new URL(path, seo.canonical).toString()

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: site.name,
    description: seo.description,
    url: seo.canonical,
    // E.164 rather than the display form: search engines parse this field.
    telephone: site.phone.e164,
    email: site.email,
    // Verified profiles, which is how a search engine ties them to the business.
    sameAs: socialLinks.map((s) => s.href),
    image,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.line1,
      addressLocality: site.address.suburb,
      addressRegion: site.address.state,
      postalCode: site.address.postcode,
      addressCountry: 'AU',
    },
    areaServed: site.serviceArea,
    slogan: site.tagline,
  }

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en-AU" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:locale" content={seo.locale} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={`${site.name}: ${site.tagline}`} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(localBusiness)}</script>
      )}
    </Helmet>
  )
}
