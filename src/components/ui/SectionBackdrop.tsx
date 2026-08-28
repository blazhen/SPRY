import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export type BackdropVariant = 'cells' | 'grid' | 'orbs' | 'strata'

interface SectionBackdropProps {
  variant?: BackdropVariant
  /** Which accent the wash is tinted with. */
  tone?: 'warm' | 'cool' | 'both'
  /** Disable the scroll parallax, e.g. inside an already pinned section. */
  still?: boolean
  className?: string
}

/**
 * Ambient depth behind a section.
 *
 * WHY THIS IS NOT WEBGL. The obvious reading of "3D in the backgrounds" is a
 * Three.js canvas per section, and that would be a serious mistake: browsers
 * cap live WebGL contexts at roughly eight to sixteen, each canvas holds its
 * own render loop, and this site already ships an 836 KB Three chunk for the
 * one scene that genuinely earns it. Twelve ambient canvases would cost more
 * than every other asset on the page combined and drain a phone battery to
 * draw something nobody is meant to look at directly.
 *
 * So depth here is built the cheap way: layered SVG and CSS gradients moving at
 * different rates as you scroll, which is exactly the parallax cue the eye
 * reads as distance. It costs no JavaScript per frame beyond one scrubbed
 * tween, and it themes itself from the palette rather than from baked colours.
 * Real WebGL is reserved for the two page heroes, where the visitor is looking
 * straight at it and only one runs at a time.
 *
 * Every variant is decorative: aria-hidden, never focusable, never hit-tested.
 */
export default function SectionBackdrop({
  variant = 'orbs',
  tone = 'warm',
  still = false,
  className = '',
}: SectionBackdropProps) {
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced || still) return
      // Two planes at different rates. The far plane barely moves, the near
      // one travels, and the gap between them is what reads as depth.
      gsap.to('[data-depth-far]', {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top bottom', end: 'bottom top', scrub: true },
      })
      gsap.to('[data-depth-near]', {
        yPercent: -22,
        ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    },
    { scope, dependencies: [reduced, still] },
  )

  const warm = 'var(--c-accent)'
  const cool = 'var(--c-accent-2)'
  const a = tone === 'cool' ? cool : warm
  const b = tone === 'both' ? cool : tone === 'cool' ? warm : cool

  return (
    <div
      ref={scope}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* ---- Colour wash. Present in every variant, and the main reason a
             section stops looking like a flat rectangle. ---- */}
      <div
        data-depth-far
        className="absolute inset-0 -top-[15%] h-[130%]"
        style={{
          background: `radial-gradient(60% 55% at 18% 12%, rgb(${a} / var(--veil)), transparent 70%),
                       radial-gradient(50% 50% at 85% 78%, rgb(${b} / var(--veil)), transparent 72%)`,
        }}
      />

      {variant === 'cells' && (
        <svg
          data-depth-near
          className="absolute inset-0 -top-[12%] size-full h-[124%] opacity-[0.55]"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Spray foam is a cell structure, so the texture is literally the
                product rather than an arbitrary pattern. */}
            <pattern id="bd-cells" width="88" height="76" patternUnits="userSpaceOnUse">
              <circle cx="22" cy="20" r="17" fill="none" stroke={`rgb(${a} / var(--veil))`} strokeWidth="1.1" />
              <circle cx="66" cy="20" r="12" fill="none" stroke={`rgb(${b} / var(--veil))`} strokeWidth="1.1" />
              <circle cx="44" cy="56" r="20" fill="none" stroke={`rgb(${a} / var(--veil))`} strokeWidth="1.1" />
              <circle cx="4" cy="60" r="9" fill="none" stroke={`rgb(${b} / var(--veil))`} strokeWidth="1.1" />
            </pattern>
            <radialGradient id="bd-cells-fade" cx="50%" cy="45%" r="62%">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id="bd-cells-mask">
              <rect width="100%" height="100%" fill="url(#bd-cells-fade)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#bd-cells)" mask="url(#bd-cells-mask)" />
        </svg>
      )}

      {variant === 'grid' && (
        <div
          data-depth-near
          className="absolute inset-x-0 bottom-0 h-[70%]"
          style={{
            // A floor plane receding to a horizon. The perspective transform is
            // what makes flat lines read as ground rather than as graph paper.
            perspective: '520px',
          }}
        >
          <div
            className="absolute inset-0 origin-bottom"
            style={{
              transform: 'rotateX(74deg) scale(2.4)',
              backgroundImage: `linear-gradient(to right, rgb(${a} / var(--veil-strong)) 1px, transparent 1px),
                                linear-gradient(to bottom, rgb(${a} / var(--veil-strong)) 1px, transparent 1px)`,
              backgroundSize: '72px 72px',
              maskImage: 'linear-gradient(to top, #000 5%, transparent 72%)',
              WebkitMaskImage: 'linear-gradient(to top, #000 5%, transparent 72%)',
            }}
          />
        </div>
      )}

      {variant === 'strata' && (
        <svg
          data-depth-near
          className="absolute inset-0 -top-[10%] size-full h-[120%]"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {/* Angled planes, echoing a wall build-up seen on the diagonal. */}
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M-10 ${18 + i * 22} L110 ${2 + i * 22} L110 ${8 + i * 22} L-10 ${24 + i * 22} Z`}
              fill={`rgb(${i % 2 === 0 ? a : b} / var(--veil))`}
            />
          ))}
        </svg>
      )}

      {variant === 'orbs' && (
        <div
          data-depth-near
          className="absolute inset-0"
          style={{
            background: `radial-gradient(38% 34% at 68% 24%, rgb(${b} / var(--veil-strong)), transparent 70%),
                         radial-gradient(30% 28% at 12% 82%, rgb(${a} / var(--veil-strong)), transparent 72%)`,
            filter: 'blur(18px)',
          }}
        />
      )}
    </div>
  )
}
