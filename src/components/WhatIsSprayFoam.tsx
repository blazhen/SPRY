import { useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { whatIsSprayFoam as copy } from '@/data/content'
import Figure from '@/components/ui/Figure'
import SectionHeading from '@/components/ui/SectionHeading'
import StageRing from '@/components/StageRing'

/**
 * "What is spray foam": the pinned scroll sequence.
 *
 * On desktop the section pins for one extra viewport. During the pin, scroll
 * progress drives a three-beat story (gaps → expands → sealed) while the
 * photograph cross-fades and a progress rule fills.
 *
 * Below `lg`, and under prefers-reduced-motion, the pin is never created and
 * the section reads as a normal stacked two-column layout with all three beats
 * visible at once. gsap.matchMedia handles the teardown when the query stops
 * matching, so resizing across the breakpoint cannot strand a pin.
 */
export default function WhatIsSprayFoam() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      // No pin here. The turntable turns on its own clock rather than on scroll
      // progress, so holding the page still bought nothing and cost the visitor
      // an extra screen of scrolling. The photograph work runs on the section's
      // own travel through the viewport instead.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: scope.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        })
        // No transition between the two photographs any more. A clip wipe left
        // a hard seam between two unrelated images at every mid-scroll
        // position, and a cross-fade there is a muddy double exposure. They are
        // simply two separate pictures now: one framed, one inset.
        //
        // Photograph drifts and eases in against the copy, so the two columns
        // move at different rates instead of travelling as one block.
        .fromTo('[data-foam-parallax]', { yPercent: -6 }, { yPercent: 6, ease: 'none' }, 0)
        .fromTo('[data-foam-zoom]', { scale: 1.06 }, { scale: 1, ease: 'none' }, 0)
        .fromTo('[data-foam-progress]', { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0)
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      id="what-is-spray-foam"
      // Alternates with the sections either side of it. See the depth ladder
      // note in tokens.css.
      className="relative overflow-hidden border-t border-white/6 bg-surface py-section lg:py-[clamp(2.5rem,5.5vh,5rem)]"
      aria-labelledby="what-is-heading"
    >
      {/* Explicit grid placement rather than two stacked columns. In DOM order
          the photograph sits between the heading and the body copy, which is
          what a phone reads top to bottom; on desktop it is placed back into
          its own column spanning all three rows. One image element, two
          completely different reading orders. */}
      <div className="shell grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-x-16 lg:gap-y-0">
        {/* ---------------- Heading ---------------- */}
        <div className="lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:pr-8">
          <SectionHeading
            intro={copy.intro}
            headingId="what-is-heading"
            headingClassName="text-h2"
          />
        </div>

        {/* ---------------- Photograph ----------------
            Second in DOM order, so on a phone it lands between the heading and
            the body copy. Placed into its own column on desktop. */}
        <div className="lg:col-span-6 lg:col-start-7 lg:row-span-3 lg:row-start-1 lg:self-center">
          {/* Fixed to a slice of viewport height on desktop rather than an
              aspect ratio: a tall ratio on a wide column is what made this
              section outgrow short screens in the first place. */}
          <div className="relative">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl sm:aspect-[3/4] lg:aspect-auto lg:h-[clamp(22rem,58vh,38rem)]">
              {/* One photograph, drifting and easing in. */}
              <div
                data-foam-parallax
                className="absolute -inset-y-[6%] inset-x-0 will-change-transform"
              >
                <div data-foam-zoom className="size-full will-change-transform">
                  {/* TODO: client to replace with real project photo */}
                  <Figure
                    image={copy.image}
                    sizes="(min-width: 1024px) 44vw, 92vw"
                    className="size-full"
                    widths={[640, 960, 1280]}
                  />
                </div>
              </div>

              {/* Bottom scrim so the caption stays legible on any photo. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/70 to-transparent"
              />

              {/* Progress rule, fills as the section travels the viewport.
                  Rendered full and rewound by the scrub, so it still reads
                  under reduced motion where no tween runs. */}
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="h-px w-full bg-white/20" aria-hidden="true">
                  <div data-foam-progress className="h-px origin-left scale-x-100 bg-accent" />
                </div>
                <p className="mt-4 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-200">
                  {copy.callout.label}
                </p>
                <p className="mt-2 max-w-measure text-small text-bone-400">{copy.callout.text}</p>
              </div>
            </div>

            {/* The second photograph, as an inset rather than a transition.
                Bordered in the page ink so it reads as a card lifted off the
                main frame. Hidden on the narrowest screens, where it would
                cover a third of the picture it is sitting on. */}
            <div className="pointer-events-none absolute -left-5 -top-5 hidden w-[38%] max-w-[12rem] overflow-hidden rounded-lg border-4 border-ink shadow-lift sm:block">
              <div className="aspect-[4/3]">
                <Figure
                  image={copy.imageSecondary}
                  sizes="(min-width: 1024px) 18vw, 30vw"
                  className="size-full"
                  widths={[640, 960]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- Body copy ---------------- */}
        <div className="lg:col-span-6 lg:col-start-1 lg:row-start-2 lg:mt-8 lg:pr-8">
          <div className="space-y-5 text-body text-bone-400 lg:space-y-4">
            {copy.body.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="max-w-measure">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* ---------------- Turntable and link ----------------
            The pin advances the index while it is running; otherwise the ring
            advances itself, so the sequence is never stalled on step one. */}
        <div className="lg:col-span-6 lg:col-start-1 lg:row-start-3 lg:mt-10 lg:pr-8">
          <StageRing stages={copy.stages} label="How spray foam seals a building" />

          <Link to={copy.cta.href} className="link-wipe mt-9 inline-flex text-accent">
            {copy.cta.label}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
