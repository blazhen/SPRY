import { useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { channelUrl, workCopy, workIntro, workVideos } from '@/data/videos'
import type { SectionIntro } from '@/data/content'
import SectionHeading from '@/components/ui/SectionHeading'
import VideoCarousel from '@/components/ui/VideoCarousel'
import SectionBackdrop from '@/components/ui/SectionBackdrop'

/**
 * Work gallery.
 *
 * Six real jobs from the company channel. Every embed is a click-to-load
 * facade, so the section costs six poster images rather than six players.
 *
 * The cards rise on entry in a short stagger. Under reduced motion they are
 * simply present, which is the finished state rather than a faster version of
 * the animation.
 */
interface WorkVideosProps {
  /** Which clips to show. Omitted shows everything. */
  sector?: 'residential' | 'commercial'
  /** Override the section opener, so a page can frame the same gallery its own way. */
  intro?: SectionIntro
  /** Ground colour, so it alternates correctly wherever it is dropped in. */
  tone?: 'base' | 'surface'
  /** Cap the number shown. */
  limit?: number
}

export default function WorkVideos({ sector, intro, tone = 'base', limit }: WorkVideosProps = {}) {
  // 'both' clips belong in every gallery, which is why the filter is not a
  // simple equality check.
  const shown = (
    sector ? workVideos.filter((v) => v.sector === sector || v.sector === 'both') : workVideos
  ).slice(0, limit ?? undefined)

  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return
      gsap.from('[data-work-rail]', {
        y: 44,
        opacity: 0,
        duration: 0.95,
        ease: 'expo.out',
        scrollTrigger: { trigger: scope.current, start: 'top 72%' },
      })
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      id="our-work"
      className={`relative border-t border-line/6 py-section ${tone === 'surface' ? 'bg-surface' : 'bg-ink'}`}
      aria-labelledby="work-heading"
    >
      <SectionBackdrop variant="orbs" tone="cool" />

      <div className="relative shell">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading intro={intro ?? workIntro} headingId="work-heading" className="max-w-2xl" />

          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link-wipe inline-flex items-center gap-2 pb-2 text-small font-bold uppercase tracking-[0.14em] text-bone-400 hover:text-accent"
          >
            {workCopy.channelLabel}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div data-work-rail className="mt-14">
          <VideoCarousel videos={shown} label={(intro ?? workIntro).headingLines.join(' ')} />
        </div>
      </div>
    </section>
  )
}
