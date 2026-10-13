import { scene as sceneCopy } from '@/data/content'

type ModeId = (typeof sceneCopy.modes)[number]['id']

/**
 * Plain 2D version of the "Batts vs foam" wall, for browsers with no WebGL or
 * where the 3D scene failed to start.
 *
 * Same wall, same two treatments, drawn as a cross-section: cold outside on the
 * left, the warm room on the right. With batts the heat finds the gaps; with
 * foam there is no gap, so it stops at the skin. The toggle beside it still
 * works, because this takes the same `mode`.
 *
 * Heat is drawn in a fixed warm orange rather than a theme token: it means the
 * same thing in every colour scheme, and the section's key already uses it.
 */
const HEAT = '#E8731A'
const FOAM = '#F3E6B8'
const BATT = '#E7C94B'

/** Where the batts leave gaps: the three horizontal lanes heat can travel along. */
const LANES = [112, 232, 352]

export default function SceneFallback({ mode }: { mode: ModeId }) {
  const leaking = mode === 'batts'
  const active = sceneCopy.modes.find((m) => m.id === mode) ?? sceneCopy.modes[0]

  return (
    <div data-scene-fallback className="grid size-full place-items-center bg-ink-800 p-4 sm:p-6">
      <svg
        viewBox="0 0 640 480"
        role="img"
        aria-label={`Wall cross-section with ${active.label.toLowerCase()}. ${active.verdict}.`}
        className="size-full max-h-full"
      >
        <defs>
          <marker id="scene-fb-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={HEAT} />
          </marker>
        </defs>

        {/* Outside (cold) and the room (warm). */}
        <rect x="0" y="0" width="150" height="480" fill="rgb(var(--c-surface))" />
        <rect x="490" y="0" width="150" height="480" fill={HEAT} fillOpacity="0.12" />

        {/* Brick */}
        <rect x="150" y="30" width="50" height="420" fill="#B5603F" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={i} x1="150" x2="200" y1={30 + i * 52.5} y2={30 + i * 52.5} stroke="#fff" strokeOpacity="0.45" />
        ))}

        {/* Insulation, in the cavity. */}
        {leaking ? (
          <>
            <rect x="200" y="30" width="190" height="64" fill={BATT} />
            <rect x="200" y="130" width="190" height="84" fill={BATT} />
            <rect x="200" y="250" width="190" height="84" fill={BATT} />
            <rect x="200" y="370" width="190" height="80" fill={BATT} />
          </>
        ) : (
          <rect x="200" y="30" width="190" height="420" fill={FOAM} />
        )}

        {/* Timber frame and internal lining. */}
        <rect x="390" y="30" width="40" height="420" fill="#9C7A52" />
        <rect x="430" y="30" width="60" height="420" fill="rgb(var(--c-ink-600))" />

        {/* Heat: out through the gaps with batts, held at the skin with foam. */}
        {leaking
          ? LANES.map((y) => (
              <line
                key={y}
                x1="540"
                x2="70"
                y1={y}
                y2={y}
                stroke={HEAT}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="14 10"
                markerEnd="url(#scene-fb-arrow)"
              />
            ))
          : LANES.map((y) => (
              <g key={y}>
                <line x1="600" x2="508" y1={y} y2={y} stroke={HEAT} strokeWidth="5" strokeLinecap="round" strokeDasharray="14 10" />
                <line x1="494" x2="494" y1={y - 22} y2={y + 22} stroke={HEAT} strokeWidth="7" strokeLinecap="round" />
              </g>
            ))}

        {/* Labels. Kept to the end of each lane so they never sit on a layer. */}
        <g fontFamily="inherit" fontSize="15" fontWeight="700" fill="rgb(var(--c-bone))">
          <text x="75" y="22" textAnchor="middle">Outside</text>
          <text x="565" y="22" textAnchor="middle">Room</text>
          <text x="295" y="472" textAnchor="middle">{active.short}</text>
        </g>
      </svg>
    </div>
  )
}
