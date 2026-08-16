import { useMemo } from 'react'
import { heroSpray } from '@/data/content'

/**
 * Wall cavity in cross-section, drawn flat but extruded.
 *
 * Deliberately 2D. An earlier hero rendered this same subject in WebGL and the
 * procedural geometry never looked better than a diagram, while costing a
 * 225 KB download. Drawn as SVG it is sharper, weighs nothing, and animates on
 * the compositor.
 *
 * The extrusion is the part that makes it legible. A flat rectangle reads as an
 * abstract container; giving it a top face that shows the build-up in section,
 * plus a right face with thickness, makes it read as a physical chunk of wall
 * that has been cut open.
 *
 * Exposes its moving parts as `data-cav-*` hooks. The hero owns the timeline
 * and drives them, so the artwork stays a dumb, testable component.
 */

const VB = { w: 470, h: 664 }
const D = 34 // extrusion depth, up and to the right

/** Vertical bands of the wall, outside to inside, on the front face. */
const BANDS = [
  { id: 'sheathing', x: 30, w: 26, face: '#8A5F49', top: '#6B4838' },
  { id: 'studL', x: 56, w: 40, face: '#C08E5C', top: '#966C43' },
  { id: 'cavity', x: 96, w: 238, face: '#111114', top: '#1B1B20' },
  { id: 'studR', x: 334, w: 40, face: '#C08E5C', top: '#966C43' },
  { id: 'lining', x: 374, w: 26, face: '#E7E2D9', top: '#B6B0A4' },
]

const FRONT = { x: 30, y: 80, w: 370, h: 490 }
const PLATE = 36
/** Interior of the cavity, where foam goes. */
const CAV = { x: 96, y: FRONT.y + PLATE, w: 238, h: FRONT.h - PLATE * 2 }

/** Rows where air escapes while the cavity is still open. */
export const ESCAPE_ROWS = [150, 224, 298, 372, 446, 500]

export default function CavityDiagram({ className = '' }: { className?: string }) {
  // Deterministic foam cells: the same wall every load, no layout thrash.
  const cells = useMemo(() => {
    let seed = 20260815
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    return Array.from({ length: 120 }, () => ({
      cx: CAV.x + rand() * CAV.w,
      cy: CAV.y + rand() * CAV.h,
      r: 8 + rand() * 20,
      o: 0.3 + rand() * 0.45,
    }))
  }, [])

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className={className}
      role="img"
      aria-label={heroSpray.diagramLabel}
    >
      <defs>
        <mask id="cav-fill-mask" maskUnits="userSpaceOnUse">
          <rect data-cav-mask x={CAV.x} y={CAV.y} width={CAV.w} height={CAV.h} fill="#fff" />
        </mask>
        <clipPath id="cav-clip">
          <rect x={CAV.x} y={CAV.y} width={CAV.w} height={CAV.h} />
        </clipPath>
        <linearGradient id="cav-foam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F3E4C8" />
          <stop offset="100%" stopColor="#D8BC92" />
        </linearGradient>
        <linearGradient id="cav-cold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7FB2F0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7FB2F0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ================= Extrusion: the top face ================= */}
      {/* Shows the build-up in section, which is what tells you this is a
          wall rather than an abstract frame. */}
      {BANDS.map((b) => (
        <polygon
          key={`top-${b.id}`}
          points={`${b.x},${FRONT.y} ${b.x + b.w},${FRONT.y} ${b.x + b.w + D},${FRONT.y - D} ${b.x + D},${FRONT.y - D}`}
          fill={b.top}
        />
      ))}

      {/* ================= Extrusion: the right face ================= */}
      <polygon
        points={`${FRONT.x + FRONT.w},${FRONT.y} ${FRONT.x + FRONT.w + D},${FRONT.y - D} ${FRONT.x + FRONT.w + D},${FRONT.y + FRONT.h - D} ${FRONT.x + FRONT.w},${FRONT.y + FRONT.h}`}
        fill="#B6B0A4"
      />

      {/* ================= Front face ================= */}
      <rect x={CAV.x} y={CAV.y} width={CAV.w} height={CAV.h} fill="#111114" />

      {/* Cold pushing in while the cavity is still open. */}
      <rect data-cav-cold x={CAV.x} y={CAV.y} width={CAV.w} height={CAV.h} fill="url(#cav-cold)" />

      {/* ---- Foam ---- */}
      <g mask="url(#cav-fill-mask)" clipPath="url(#cav-clip)">
        <rect x={CAV.x} y={CAV.y} width={CAV.w} height={CAV.h} fill="url(#cav-foam)" />
        {cells.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="#C6A672" opacity={c.o * 0.5} />
        ))}
      </g>

      {/* Lumpy leading edge, travelling with the fill. */}
      <g data-cav-edge clipPath="url(#cav-clip)">
        <path
          d={`M${CAV.x} ${CAV.y + CAV.h}
             c 20 -16, 34 10, 54 -4
             s 38 -18, 58 2
             s 34 12, 56 -6
             s 40 -10, 72 6
             v 60 h -240 z`}
          fill="#F3E4C8"
        />
      </g>

      {/* ---- Warmth escaping the room, inside to outside ----
           Two flows cross this cavity and they run in opposite directions,
           which is correct: cold pushes in from outside, warm air leaks out
           from the room. Drawn in one colour they read as a single system
           contradicting itself, so the escape is warm and the draught is cold.
           The labels below the wall say which side is which. */}
      <g clipPath="url(#cav-clip)">
        {ESCAPE_ROWS.map((y, i) => (
          <circle
            key={y}
            data-cav-escape
            data-row={i}
            cx={CAV.x + CAV.w - 14}
            cy={y}
            r={7}
            fill="rgb(var(--c-accent-300))"
            // Reads as a wisp of escaping warmth rather than a hard dot.
            style={{ filter: 'drop-shadow(0 0 7px rgb(var(--c-accent) / 0.95))' }}
          />
        ))}
      </g>

      {/* ---- Draft arrows, dashes flowing while the cavity leaks ---- */}
      <g stroke="#8CC0FF" strokeWidth="3" fill="none" strokeLinecap="round">
        {[186, 336, 486].map((y) => (
          <g key={y} data-cav-arrow>
            <line
              className="cav-flow"
              x1={CAV.x + 10}
              y1={y}
              x2={CAV.x + 130}
              y2={y}
              strokeDasharray="9 8"
            />
            <path d={`M${CAV.x + 138} ${y - 8} l9 8 -9 8`} />
          </g>
        ))}
      </g>

      {/* ================= Structure, over the fill ================= */}
      {BANDS.filter((b) => b.id !== 'cavity').map((b) => (
        <rect key={b.id} x={b.x} y={FRONT.y} width={b.w} height={FRONT.h} fill={b.face} />
      ))}
      {/* Top and bottom plates */}
      <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height={PLATE} fill="#D9A876" />
      <rect x={FRONT.x} y={FRONT.y + FRONT.h - PLATE} width={FRONT.w} height={PLATE} fill="#D9A876" />

      {/* Hairline where the front meets the top, so the fold reads. */}
      <line
        x1={FRONT.x}
        y1={FRONT.y}
        x2={FRONT.x + FRONT.w}
        y2={FRONT.y}
        stroke="#000"
        strokeOpacity="0.25"
        strokeWidth="2"
      />

      {/* ================= Warm wash once sealed ================= */}
      <rect
        data-cav-warm
        x={FRONT.x}
        y={FRONT.y - D}
        width={FRONT.w + D}
        height={FRONT.h + D}
        fill="rgb(var(--c-accent))"
        opacity="0"
        style={{ mixBlendMode: 'soft-light' }}
      />

      {/* ================= Nozzle ================= */}
      <g data-cav-nozzle opacity="0">
        <path d="M0 -18 L34 62 L-34 62 Z" fill="rgb(var(--c-accent))" opacity="0.28" />
        <path d="M0 -18 L18 46 L-18 46 Z" fill="rgb(var(--c-accent))" opacity="0.32" />
        <rect x="-11" y="-64" width="22" height="46" rx="6" fill="#E9E4DA" />
        <rect x="-6" y="-24" width="12" height="12" rx="2" fill="rgb(var(--c-accent))" />
        <rect x="-24" y="-58" width="14" height="9" rx="3" fill="#B9B2A6" />
      </g>

      {/* ================= Which side is which ================= */}
      <g className="cav-axis">
        <text x={FRONT.x} y={FRONT.h + FRONT.y + 34} fill="#8CC0FF">
          OUTSIDE
        </text>
        <text
          x={FRONT.x + FRONT.w + D}
          y={FRONT.h + FRONT.y + 34}
          textAnchor="end"
          fill="rgb(var(--c-accent))"
        >
          INSIDE
        </text>
      </g>

      {/* ================= Sealed stamp ================= */}
      <g data-cav-stamp opacity="0">
        <rect
          x={CAV.x + CAV.w / 2 - 74}
          y={CAV.y + CAV.h / 2 - 26}
          width="148"
          height="52"
          rx="26"
          fill="rgb(var(--c-ink))"
          fillOpacity="0.72"
          stroke="rgb(var(--c-accent))"
          strokeWidth="2"
        />
        <path
          d={`M${CAV.x + CAV.w / 2 - 46} ${CAV.y + CAV.h / 2} l12 13 22 -26`}
          fill="none"
          stroke="rgb(var(--c-accent))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x={CAV.x + CAV.w / 2 + 22}
          y={CAV.y + CAV.h / 2 + 7}
          textAnchor="middle"
          fill="rgb(var(--c-bone))"
          className="cav-stamp-text"
        >
          SEALED
        </text>
      </g>
    </svg>
  )
}
