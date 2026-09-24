import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import Seo from '@/components/ui/Seo'
import SectionBackdrop from '@/components/ui/SectionBackdrop'
import ProtectedImage from '@/components/ui/ProtectedImage'
import Breadcrumbs from '@/components/Breadcrumbs'
import { PageCta } from '@/components/PageParts'
import NotFound from '@/pages/NotFound'
import { blogAuthor, blogPosts, formatPostDate } from '@/data/blog'
import { seo, site } from '@/data/site'

/**
 * A single article.
 *
 * Bodies are stored as tagged blocks rather than HTML, so nothing the client
 * writes can inject markup into the page and every paragraph, subheading and
 * bullet is styled by this file rather than by whatever the old editor left
 * behind. Consecutive bullets are gathered back into one list on the way out.
 *
 * Every article carries a byline at the top and the author at the bottom, and
 * publishes both as Article structured data, so a reader and a search engine
 * see the same person standing behind the words.
 */
export default function BlogPost() {
  const { slug } = useParams()
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) return <NotFound />

  // Blocks arrive flat. Bullets that follow each other belong in one list.
  const groups: Array<{ tag: 'h' | 'p' | 'list'; text?: string; items?: string[] }> = []
  for (const block of post.body) {
    const last = groups[groups.length - 1]
    if (block.tag === 'li') {
      if (last?.tag === 'list') last.items!.push(block.text)
      else groups.push({ tag: 'list', items: [block.text] })
    } else {
      groups.push({ tag: block.tag, text: block.text })
    }
  }

  const url = new URL(`/blog/${post.slug}`, seo.canonical).toString()
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: new URL(post.image, seo.canonical).toString(),
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: {
      '@type': 'Person',
      name: blogAuthor.name,
      jobTitle: blogAuthor.role,
      url: new URL(blogAuthor.href, seo.canonical).toString(),
    },
    publisher: { '@type': 'Organization', name: site.name, url: seo.canonical },
    mainEntityOfPage: url,
  }

  const initials = blogAuthor.name
    .split(' ')
    .map((part) => part[0])
    .join('')

  return (
    <>
      <Seo title={`${post.title} | Spray It Solutions`} description={post.excerpt} path={`/blog/${post.slug}`} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
      </Helmet>

      <article>
        <header className="relative overflow-hidden bg-ink pb-14 pt-[calc(var(--header-h)+clamp(2.5rem,6vh,4.5rem))]">
          <SectionBackdrop variant="orbs" tone="both" />

          <div className="relative shell max-w-4xl">
            <Breadcrumbs items={[{ label: 'Blog', href: '/blog' }, { label: post.title }]} className="mb-8" />

            <Link to="/blog" className="link-wipe inline-flex text-small font-semibold text-bone-400">
              <ArrowLeft className="size-4" aria-hidden="true" />
              All articles
            </Link>

            <h1 className="mt-8 font-display text-h1 font-semibold leading-tight text-bone">
              {post.title}
            </h1>

            {/* Byline: who, and when. */}
            <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-bone-400">
              <span>
                By{' '}
                <Link to={blogAuthor.href} className="link-wipe font-semibold text-bone">
                  {blogAuthor.name}
                </Link>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Published <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              </span>
              {post.updated && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Updated <time dateTime={post.updated}>{formatPostDate(post.updated)}</time>
                  </span>
                </>
              )}
            </p>

            <p className="mt-6 max-w-measure text-body text-bone-400">{post.excerpt}</p>
          </div>

          <div className="relative shell mt-12 max-w-5xl">
            <div className="overflow-hidden rounded-xl border border-line/10">
              <div className="relative aspect-[16/9]">
                <ProtectedImage
                  src={post.image}
                  alt={post.alt}
                  frameClassName="size-full"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="relative overflow-hidden border-t border-line/6 bg-surface py-section">
          <SectionBackdrop variant="strata" tone="cool" />

          <div className="relative shell max-w-3xl">
            {groups.map((g, i) => {
              if (g.tag === 'h') {
                return (
                  <h2
                    key={i}
                    className="mt-12 font-display text-h3 font-semibold leading-tight text-bone first:mt-0"
                  >
                    {g.text}
                  </h2>
                )
              }
              if (g.tag === 'list') {
                return (
                  <ul key={i} className="mt-6 space-y-3 border-l-2 border-accent/30 pl-6">
                    {g.items!.map((item) => (
                      <li key={item} className="text-body text-bone-400">
                        {item}
                      </li>
                    ))}
                  </ul>
                )
              }
              return (
                <p key={i} className="mt-6 text-body leading-relaxed text-bone-400 first:mt-0">
                  {g.text}
                </p>
              )
            })}

            <p className="mt-14 border-t border-line/10 pt-8">
              <Link to="/contact" className="link-wipe font-semibold text-accent">
                Talk to us about your building
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </p>

            {/* The author. A portrait goes in place of the initials once the
                client supplies one; the box does not wait for it. */}
            <aside
              className="mt-12 flex flex-col gap-5 rounded-xl border border-line/10 bg-ink-800 p-7 sm:flex-row sm:items-start"
              aria-label="About the author"
            >
              {blogAuthor.photo ? (
                <img
                  src={blogAuthor.photo}
                  alt={`${blogAuthor.name}, ${blogAuthor.role}`}
                  width={96}
                  height={96}
                  loading="lazy"
                  className="size-24 shrink-0 rounded-pill object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-24 shrink-0 place-items-center rounded-pill bg-accent font-display text-h3 font-semibold text-ink"
                >
                  {initials}
                </span>
              )}
              <div>
                <p className="text-eyebrow font-bold uppercase tracking-[0.18em] text-accent">
                  Written by
                </p>
                <p className="mt-2 font-display text-h4 font-semibold text-bone">
                  <Link to={blogAuthor.href} className="hover:text-accent">
                    {blogAuthor.name}
                  </Link>
                </p>
                <p className="text-small font-semibold text-bone-400">{blogAuthor.role}</p>
                <p className="mt-3 max-w-measure text-small leading-relaxed text-bone-400">
                  {blogAuthor.bio}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </article>

      <PageCta />
    </>
  )
}
