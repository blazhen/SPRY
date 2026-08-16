import { useRef, type ReactNode } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { SectionIntro } from '@/data/content'

interface SectionHeadingProps {
  intro: SectionIntro
  /** Applied to the heading element so a section can `aria-labelledby` it. */
  headingId?: string
  /** Heading level. Sections use h2, the page title uses h1. */
  as?: 'h1' | 'h2' | 'h3'
  align?: 'left' | 'center'
  className?: string
  headingClassName?: string
  /** Dark-on-light sections need inverted body copy colours. */
  tone?: 'on-dark' | 'on-light'
  children?: ReactNode
}

/**
 * The standard section opener: eyebrow, masked line-by-line heading reveal,
 * then the lede. Each line lives inside an overflow-hidden mask and slides up
 * from below on scroll. This is the house style for every heading on the site.
 */
export default function SectionHeading({
  intro,
  headingId,
  as: Tag = 'h2',
  align = 'left',
  className = '',
  headingClassName = 'text-h2',
  tone = 'on-dark',
  children,
}: SectionHeadingProps) {
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap
        .timeline({
          scrollTrigger: {
            trigger: scope.current,
            start: 'top 82%',
            once: true,
          },
        })
        .from('[data-reveal-eyebrow]', { autoAlpha: 0, y: 14, duration: 0.5 })
        .from(
          '[data-reveal-line]',
          { yPercent: 115, duration: 1, stagger: 0.09, ease: 'power4.out' },
          '-=0.28',
        )
        .from('[data-reveal-lede]', { autoAlpha: 0, y: 18, duration: 0.7 }, '-=0.55')
        .from('[data-reveal-extra]', { autoAlpha: 0, y: 18, duration: 0.7 }, '-=0.5')
    },
    { scope, dependencies: [reduced] },
  )

  /** Wrap the accent word in its own coloured span, leaving the rest intact. */
  const renderLine = (line: string) => {
    const word = intro.accentWord
    if (!word || !line.includes(word)) return line
    const [before, ...rest] = line.split(word)
    return (
      <>
        {before}
        <span className="text-accent">{word}</span>
        {rest.join(word)}
      </>
    )
  }

  return (
    <div
      ref={scope}
      className={`${align === 'center' ? 'text-center' : ''} ${className}`}
    >
      <span className={`eyebrow ${align === 'center' ? 'justify-center' : ''}`} data-reveal-eyebrow>
        {intro.eyebrow}
      </span>

      <Tag id={headingId} className={`mt-6 ${headingClassName}`}>
        {intro.headingLines.map((line) => (
          <span className="line-mask" key={line}>
            <span className="line-inner" data-reveal-line>
              {renderLine(line)}
            </span>
          </span>
        ))}
      </Tag>

      {intro.lede && (
        <p
          className={`mt-7 max-w-measure text-lead ${
            tone === 'on-dark' ? 'text-bone-400' : 'text-ink/70'
          } ${align === 'center' ? 'mx-auto' : ''}`}
          data-reveal-lede
        >
          {intro.lede}
        </p>
      )}

      {children && <div data-reveal-extra>{children}</div>}
    </div>
  )
}
