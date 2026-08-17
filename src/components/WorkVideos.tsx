import { useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { channelUrl, workCopy, workIntro, workVideos } from '@/data/videos'
import SectionHeading from '@/components/ui/SectionHeading'
import VideoEmbed from '@/components/ui/VideoEmbed'

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
export default function WorkVideos() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return
      gsap.from('[data-work-card]', {
        y: 42,
        opacity: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { trigger: scope.current, start: 'top 72%' },
      })
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      id="our-work"
      className="relative border-t border-line/6 bg-ink py-section"
      aria-labelledby="work-heading"
    >
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading intro={workIntro} headingId="work-heading" className="max-w-2xl" />

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

        <ul className="mt-14 grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {workVideos.map((video) => (
            <li key={video.id} data-work-card>
              <VideoEmbed id={video.id} title={video.title} poster={video.poster} />
              <h3 className="mt-5 font-display text-h4 font-semibold leading-tight text-bone">
                {video.title}
              </h3>
              <p className="mt-2 text-small leading-snug text-bone-400">{video.blurb}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
