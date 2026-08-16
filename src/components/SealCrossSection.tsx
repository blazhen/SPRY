import { heroSeal } from '@/data/content'

interface SealCrossSectionProps {
  /** Index of the layer to highlight, or -1 for none. */
  active?: number
  className?: string
  /** Hides the cold and warm annotations for the quieter poster use. */
  bare?: boolean
}

/**
 * The wall cross-section as flat SVG.
 *
 * Does three jobs, which is why it is a component rather than markup inside the
 * hero: it is the Suspense poster while the 3D chunk downloads, the mobile
 * substitute for the fly-through, and the prefers-reduced-motion substitute.
 * Because it is the poster, first paint shows the real subject rather than a
 * spinner, and the swap to 3D is not a jarring change of content.
 *
 * Drawn with brand tokens, no images, and no animation of its own.
 */
export default function SealCrossSection({
  active = -1,
  className = '',
  bare = false,
}: SealCrossSectionProps) {
  // Band edges along the section, outside (left) to inside (right).
  const bands = [
    { x: 40, w: 66 },
    { x: 106, w: 74 },
    { x: 180, w: 168 },
    { x: 348, w: 32 },
    { x: 380, w: 180 },
  ]
  const top = 34
  const height = 214
  const bottom = top + height

  return (
    <svg
      viewBox="0 0 600 330"
      className={className}
      role="img"
      aria-label="Cross-section through an insulated wall: external cladding, batten cavity, closed-cell spray foam, plasterboard, and the room inside."
    >
      <defs>
        <pattern id="seal-batten" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="rgb(var(--c-ink-800))" />
          <rect width="6" height="18" fill="rgb(var(--c-accent) / 0.35)" />
        </pattern>
        <linearGradient id="seal-room" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--c-accent) / 0.30)" />
          <stop offset="100%" stopColor="rgb(var(--c-accent) / 0.02)" />
        </linearGradient>
        <linearGradient id="seal-foam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2E2C6" />
          <stop offset="100%" stopColor="#DCC29B" />
        </linearGradient>
      </defs>

      {/* --- Layer bands --- */}
      {/* 01 cladding */}
      <rect x={bands[0].x} y={top} width={bands[0].w} height={height} fill="#6E4A3A" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect
          key={i}
          x={bands[0].x}
          y={top + 6 + i * 23}
          width={bands[0].w}
          height={2}
          fill="#4B3125"
        />
      ))}

      {/* 02 batten cavity */}
      <rect x={bands[1].x} y={top} width={bands[1].w} height={height} fill="url(#seal-batten)" />

      {/* 03 foam */}
      <rect x={bands[2].x} y={top} width={bands[2].w} height={height} fill="url(#seal-foam)" />
      {Array.from({ length: 34 }, (_, i) => {
        // Deterministic pseudo-random cells, so it renders identically always.
        const a = (i * 97) % 151
        const b = (i * 53) % 199
        return (
          <circle
            key={i}
            cx={bands[2].x + 12 + (a / 151) * (bands[2].w - 24)}
            cy={top + 12 + (b / 199) * (height - 24)}
            r={3 + ((i * 7) % 5)}
            fill="#C9AC82"
            opacity={0.5}
          />
        )
      })}

      {/* 04 plasterboard */}
      <rect x={bands[3].x} y={top} width={bands[3].w} height={height} fill="#E7E2D9" />

      {/* 05 room */}
      <rect x={bands[4].x} y={top} width={bands[4].w} height={height} fill="url(#seal-room)" />

      {!bare && (
        <>
          {/* Cold pushing in from outside, stopping at the foam. */}
          {[0.22, 0.45, 0.68].map((f) => {
            const y = top + height * f
            return (
              <g key={f} stroke="#8CC0FF" strokeWidth="2" opacity="0.85">
                <line x1="6" y1={y} x2={bands[2].x - 4} y2={y} strokeDasharray="7 6" />
                <path d={`M${bands[2].x - 12} ${y - 5} l7 5 -7 5`} fill="none" />
              </g>
            )
          })}
          {/* Heat held on the inside. */}
          {[0.3, 0.55, 0.78].map((f, i) => (
            <circle
              key={f}
              cx={bands[4].x + 26 + i * 34}
              cy={top + height * f}
              r="5"
              fill="rgb(var(--c-accent))"
              opacity="0.9"
            />
          ))}
        </>
      )}

      {/* --- Highlight + numbering --- */}
      {bands.map((b, i) => {
        const on = i === active
        return (
          <g key={b.x}>
            <rect
              x={b.x}
              y={top}
              width={b.w}
              height={height}
              fill={on ? 'rgb(var(--c-accent) / 0.18)' : 'transparent'}
              stroke={on ? 'rgb(var(--c-accent))' : 'rgb(255 255 255 / 0.18)'}
              strokeWidth={on ? 2 : 1}
            />
            <text
              x={b.x + b.w / 2}
              y={bottom + 28}
              textAnchor="middle"
              className="font-body"
              fontSize="13"
              fontWeight="700"
              letterSpacing="2"
              fill={on ? 'rgb(var(--c-accent))' : 'rgb(var(--c-bone-400))'}
            >
              {String(i + 1).padStart(2, '0')}
            </text>
            <text
              x={b.x + b.w / 2}
              y={bottom + 50}
              textAnchor="middle"
              fontSize="12"
              fill={on ? 'rgb(var(--c-bone))' : 'rgb(var(--c-bone-400))'}
            >
              {/* Shortened so five labels fit across the section. */}
              {heroSeal.layers[i].name.split(' ').slice(-1)[0]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
