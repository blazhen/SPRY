import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import Seo from '@/components/ui/Seo'
import SectionBackdrop from '@/components/ui/SectionBackdrop'
import ProtectedImage from '@/components/ui/ProtectedImage'
import { PageCta } from '@/components/PageParts'
import NotFound from '@/pages/NotFound'
import { blogPosts, formatPostDate } from '@/data/blog'

/**
 * A single article.
 *
 * Bodies are stored as tagged blocks rather than HTML, so nothing the client
 * writes can inject markup into the page and every paragraph, subheading and
 * bullet is styled by this file rather than by whatever the old editor left
 * behind. Consecutive bullets are gathered back into one list on the way out.
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

  return (
    <>
      <Seo title={`${post.title} | Spray It Solutions`} description={post.excerpt} path={`/blog/${post.slug}`} />

      <article>
        <header className="relative overflow-hidden bg-ink pb-14 pt-[calc(var(--header-h)+clamp(3rem,8vh,6rem))]">
          <SectionBackdrop variant="orbs" tone="both" />

          <div className="relative shell max-w-4xl">
            <Link to="/blog" className="link-wipe inline-flex text-small font-semibold text-bone-400">
              <ArrowLeft className="size-4" aria-hidden="true" />
              All articles
            </Link>

            <p className="mt-8 text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
              {formatPostDate(post.date)}
            </p>
            <h1 className="mt-5 font-display text-h1 font-semibold leading-tight text-bone">
              {post.title}
            </h1>
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
          </div>
        </div>
      </article>

      <PageCta />
    </>
  )
}
