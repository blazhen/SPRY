import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Seo from '@/components/ui/Seo'
import SectionHeading from '@/components/ui/SectionHeading'
import SectionBackdrop from '@/components/ui/SectionBackdrop'
import ProtectedImage from '@/components/ui/ProtectedImage'
import { PageCta } from '@/components/PageParts'
import { blogIntro, blogPosts, formatPostDate } from '@/data/blog'

/**
 * Blog index.
 *
 * Four articles carried across from the site this replaces, newest first. The
 * addresses are unchanged, so the redirects that currently send these to the
 * closest matching page now resolve to the articles themselves.
 */
export default function Blog() {
  const [lead, ...rest] = blogPosts

  return (
    <>
      <Seo
        title="Blog | Spray It Solutions"
        description="Case studies from real spray foam jobs, and plain explanations of the questions we get asked most."
        path="/blog"
      />

      <section
        className="relative overflow-hidden bg-ink pb-section pt-[calc(var(--header-h)+clamp(3rem,8vh,6rem))]"
        aria-labelledby="blog-heading"
      >
        <SectionBackdrop variant="orbs" tone="both" />

        <div className="relative shell">
          <div className="max-w-3xl">
            <SectionHeading
              intro={blogIntro}
              as="h1"
              headingId="blog-heading"
              headingClassName="text-h1"
            />
          </div>

          {/* The newest article gets the wide treatment: with four posts, a flat
              grid of four equal cards reads as an archive rather than a lead. */}
          {lead && (
            <article className="mt-14 grid items-center gap-8 border-t border-line/10 pt-12 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <Link to={`/blog/${lead.slug}`} className="block overflow-hidden rounded-xl border border-line/10">
                  <div className="relative aspect-[16/9]">
                    <ProtectedImage
                      src={lead.image}
                      alt={lead.alt}
                      frameClassName="size-full"
                      loading="eager"
                    />
                  </div>
                </Link>
              </div>

              <div className="lg:col-span-5">
                <p className="text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
                  Latest · {formatPostDate(lead.date)}
                </p>
                <h2 className="mt-5 font-display text-h2 font-semibold leading-tight text-bone">
                  <Link to={`/blog/${lead.slug}`} className="hover:text-accent">
                    {lead.title}
                  </Link>
                </h2>
                <p className="mt-5 max-w-measure text-body text-bone-400">{lead.excerpt}</p>
                <Link to={`/blog/${lead.slug}`} className="link-wipe mt-7 inline-flex text-accent">
                  Read the article
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          )}

          {rest.length > 0 && (
            <ul className="mt-16 grid gap-8 border-t border-line/10 pt-12 md:grid-cols-3">
              {rest.map((post) => (
                <li key={post.slug}>
                  <article className="flex h-full flex-col">
                    <Link
                      to={`/blog/${post.slug}`}
                      className="block overflow-hidden rounded-xl border border-line/10"
                    >
                      <div className="relative aspect-[16/10]">
                        <ProtectedImage
                          src={post.image}
                          alt={post.alt}
                          frameClassName="size-full"
                          loading="lazy"
                        />
                      </div>
                    </Link>
                    <p className="mt-5 text-eyebrow font-bold uppercase tracking-[0.16em] text-bone-400">
                      {formatPostDate(post.date)}
                    </p>
                    <h3 className="mt-3 font-display text-h4 font-semibold leading-tight text-bone">
                      <Link to={`/blog/${post.slug}`} className="hover:text-accent">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-3 text-small text-bone-400">{post.excerpt.slice(0, 150)}</p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <PageCta />
    </>
  )
}
