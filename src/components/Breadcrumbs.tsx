import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ChevronRight } from 'lucide-react'
import { seo } from '@/data/site'

export interface Crumb {
  label: string
  /** Omitted on the last crumb, which is the page itself. */
  href?: string
}

/**
 * Breadcrumb trail. Home is always the first step, so callers pass only what
 * comes after it. The same list is published as BreadcrumbList structured
 * data, which is what puts the trail under the result in a search listing.
 */
export default function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  const trail: Crumb[] = [{ label: 'Home', href: '/' }, ...items]
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      ...(crumb.href ? { item: new URL(crumb.href, seo.canonical).toString() } : {}),
    })),
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-small text-bone-400">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1
          return (
            <li key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden="true" />}
              {last || !crumb.href ? (
                <span aria-current="page" className="font-semibold text-bone">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.href} className="link-wipe hover:text-accent">
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
