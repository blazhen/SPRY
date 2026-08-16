import { useMemo } from 'react'
import { heroHouse } from '@/data/content'

/**
 * Two-storey house in cutaway.
 *
 * Rules this drawing has to obey, each of which an earlier pass broke:
 *
 *  1. Foam goes INSIDE the construction. Walls are three parts (outer leaf,
 *     cavity, inner lining) and the foam fills the cavity between them, not the
 *     face of the room.
 *  2. Nothing is drawn beyond the shape that contains it. The attic follows the
 *     real roof underside and the roof foam runs parallel to the pitch, because
 *     drawing either straight to the eaves pushed it out past the roof.
 *  3. Nothing floats. Every layer sits on something: the roof foam on rafters
 *     and ceiling joists, the underfloor foam on bearers, the piers on footings
 *     bedded into ground with actual depth.
 *
 * Exposes `data-h-*` hooks; the hero owns the timeline.
 */

const VB = { w: 760, h: 600 }

// --- Shell -----------------------------------------------------------------
const OUT = { left: 60, right: 700 }
const WALL = { leafOuter: 18, cavity: 22, lining: 12 }
const L = {
  outer: OUT.left,
  cav: OUT.left + WALL.leafOuter,
  lining: OUT.left + WALL.leafOuter + WALL.cavity,
  inner: OUT.left + WALL.leafOuter + WALL.cavity + WALL.lining, // 112
}
const R = {
  inner: OUT.right - WALL.leafOuter - WALL.cavity - WALL.lining, // 648
  lining: OUT.right - WALL.leafOuter - WALL.cavity,
  cav: OUT.right - WALL.leafOuter,
  outer: OUT.right,
}
const ROOM = { x: L.inner, w: R.inner - L.inner }

const ROOF = { apexX: 380, apexY: 22, eaveY: 190, eaveL: 40, eaveR: 720 }
const CEIL = { y: 228, h: 12 }
const FLOORS = { upperTop: 240, midTop: 356, midH: 18, groundTop: 374, groundBottom: 496 }
const SLAB = { y: 496, h: 16 }
const FOAM_FLOOR = { y: 512, h: 16 }
const SUB = { top: 528, bottom: 552 }
const GROUND_Y = 552
const WALL_CAV = { top: CEIL.y, bottom: SLAB.y }

/** Inner face of the ridge, where the roof band's underside starts. */
const APEX_IN = ROOF.apexY + 26
/** Y of the roof underside at any x. Keeps the attic and its foam inside the roof. */
const undersideY = (x: number) =>
  APEX_IN + Math.abs(x - ROOF.apexX) * ((ROOF.eaveY - APEX_IN) / (ROOF.apexX - (ROOF.eaveL + 26)))

const C = {
  roof: '#7C513C',
  roofDark: '#5E3B2B',
  ridge: '#8A5F49',
  brick: '#9A6A50',
  brickLine: '#7A5240',
  timber: '#C08E5C',
  timberDark: '#9C7146',
  lining: '#E7E2D9',
  slab: '#D9A876',
  room: '#15151A',
  floorBoard: '#3A2C24',
  foam: '#EFDCBC',
  glass: '#2B3A52',
  glassWarm: '#FFC98A',
  soil: '#241B16',
  soilDeep: '#181210',
  // Barely-there olive. A saturated turf line drew a green stripe across a
  // page that has no other green in it.
  turf: '#2A2C22',
  pier: '#6B4838',
}

/** A curl of escaping air. Horizontal by default; rotated per zone. */
const GUST = 'M0 0c9-6 20-6 29 0 6 4 13 4 19 0'

export default function HouseSection({ className = '' }: { className?: string }) {
  const cells = useMemo(() => {
    let seed = 815202
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    return Array.from({ length: 120 }, () => ({ a: rand(), b: rand(), c: rand() }))
  }, [])

  /**
   * Three nested groups per wisp, and the nesting matters.
   *
   * Position lives on the outer group and orientation on the path. The middle
   * group carries nothing, and is the only thing GSAP touches. Animating x or y
   * on an element that already has a `transform` attribute makes GSAP replace
   * that whole transform rather than offset it, so a wisp positioned by
   * attribute would snap to the origin the moment it animated. That is what put
   * gusts drifting around inside the rooms.
   */
  const gust = (zone: string, items: Array<{ x: number; y: number; r: number; s?: number }>) => (
    <g
      data-h-leak={zone}
      stroke="rgb(var(--c-accent-300))"
      strokeWidth="3.5"
      fill="none"
      strokeLinecap="round"
    >
      {items.map((g, i) => (
        <g key={`${zone}-${i}`} transform={`translate(${g.x} ${g.y})`}>
          <g data-h-wisp>
            <path
              d={GUST}
              // Centred on its own anchor, then turned to face the way it travels.
              transform={`rotate(${g.r}) scale(${g.s ?? 1}) translate(-24 -2)`}
              style={{ filter: 'drop-shadow(0 0 7px rgb(var(--c-accent) / 0.85))' }}
            />
          </g>
        </g>
      ))}
    </g>
  )

  /** Attic struts, spaced across the span, each cut to the roof above it. */
  const struts = [230, 300, 460, 530]

  return (
    <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className={className} role="img" aria-label={heroHouse.diagramLabel}>
      <defs>
        <clipPath id="h-clip-roof">
          <rect data-h-clip="roof" x={ROOF.eaveL} y={ROOF.apexY} width={ROOF.eaveR - ROOF.eaveL} height={ROOF.eaveY - ROOF.apexY + 40} />
        </clipPath>
        <clipPath id="h-clip-wall">
          <rect data-h-clip="wall" x={0} y={WALL_CAV.top} width={VB.w} height={WALL_CAV.bottom - WALL_CAV.top} />
        </clipPath>
        <clipPath id="h-clip-floor">
          <rect data-h-clip="floor" x={ROOM.x} y={FOAM_FLOOR.y} width={ROOM.w} height={FOAM_FLOOR.h} />
        </clipPath>
        <linearGradient id="h-warm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.42" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="h-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.soil} />
          <stop offset="100%" stopColor={C.soilDeep} />
        </linearGradient>
      </defs>

      {/* ================= Ground, drawn first so the house sits on it ====== */}
      <rect x="0" y={GROUND_Y} width={VB.w} height={VB.h - GROUND_Y} fill="url(#h-soil)" />
      <rect x="0" y={GROUND_Y} width={VB.w} height="5" fill={C.turf} />
      {/* Stones and grit, so the earth has substance rather than being a bar. */}
      {cells.slice(66, 110).map((c, i) => (
        <ellipse
          key={`soil-${i}`}
          cx={c.a * VB.w}
          cy={GROUND_Y + 14 + c.b * (VB.h - GROUND_Y - 18)}
          rx={2 + c.c * 5}
          ry={1.5 + c.c * 3}
          fill="#3A2C24"
          opacity={0.5 + c.c * 0.3}
        />
      ))}
      {/* Contact shadow under the building. */}
      <ellipse cx={ROOF.apexX} cy={GROUND_Y + 4} rx={330} ry={11} fill="#000" opacity="0.45" />

      {/* ================= Interior voids ================= */}
      <rect x={ROOM.x} y={FLOORS.upperTop} width={ROOM.w} height={FLOORS.midTop - FLOORS.upperTop} fill={C.room} />
      <rect x={ROOM.x} y={FLOORS.groundTop} width={ROOM.w} height={FLOORS.groundBottom - FLOORS.groundTop} fill={C.room} />
      {/* Floor surface in each room, so they read as rooms and not as holes. */}
      <rect x={ROOM.x} y={FLOORS.midTop - 6} width={ROOM.w} height="6" fill={C.floorBoard} />
      <rect x={ROOM.x} y={FLOORS.groundBottom - 6} width={ROOM.w} height="6" fill={C.floorBoard} />

      <g data-h-warm opacity="0">
        <rect x={ROOM.x} y={FLOORS.upperTop} width={ROOM.w} height={FLOORS.midTop - FLOORS.upperTop} fill="url(#h-warm)" />
        <rect x={ROOM.x} y={FLOORS.groundTop} width={ROOM.w} height={FLOORS.groundBottom - FLOORS.groundTop} fill="url(#h-warm)" />
      </g>

      {/* ================= Attic void, bounded by the real roof underside === */}
      <path
        d={`M${ROOF.apexX} ${APEX_IN}
            L${R.outer} ${undersideY(R.outer)}
            L${R.outer} ${CEIL.y}
            L${L.outer} ${CEIL.y}
            L${L.outer} ${undersideY(L.outer)} Z`}
        fill={C.room}
      />

      {/* Attic framing: king post and struts. Without them the roof space is a
          large empty triangle and the foam above it appears to float. */}
      <g>
        <rect x={ROOF.apexX - 7} y={APEX_IN} width="14" height={CEIL.y - APEX_IN} fill={C.timberDark} />
        {struts.map((x) => (
          <rect key={x} x={x - 6} y={undersideY(x)} width="12" height={CEIL.y - undersideY(x)} fill={C.timberDark} />
        ))}
        {/* Collar tie across the roof space. */}
        <rect x={240} y={132} width={280} height="12" fill={C.timberDark} />
      </g>

      {/* ================= Foam: roof, on the rafters ================= */}
      <g data-h-foam="roof" clipPath="url(#h-clip-roof)">
        {[
          `M${ROOF.apexX} ${APEX_IN} L${ROOF.eaveL + 26} ${ROOF.eaveY} L${ROOF.eaveL + 26} ${ROOF.eaveY + 22} L${ROOF.apexX} ${APEX_IN + 22} Z`,
          `M${ROOF.apexX} ${APEX_IN} L${ROOF.eaveR - 26} ${ROOF.eaveY} L${ROOF.eaveR - 26} ${ROOF.eaveY + 22} L${ROOF.apexX} ${APEX_IN + 22} Z`,
        ].map((d, i) => (
          <path key={i} d={d} fill={C.foam} />
        ))}
        {cells.slice(0, 22).map((c, i) => (
          <circle key={`rf-${i}`} cx={L.outer + 40 + c.a * (R.outer - L.outer - 80)} cy={APEX_IN + 20 + c.b * 120} r={3 + c.c * 6} fill="#C6A672" opacity="0.4" />
        ))}
      </g>

      {/* ================= Foam: wall cavities ================= */}
      <g data-h-foam="wall" clipPath="url(#h-clip-wall)">
        {[L.cav, R.lining].map((x) => (
          <g key={x}>
            <rect x={x} y={WALL_CAV.top} width={WALL.cavity} height={WALL_CAV.bottom - WALL_CAV.top} fill={C.foam} />
            {cells.slice(22, 44).map((c, i) => (
              <circle key={`wf-${x}-${i}`} cx={x + 3 + c.a * (WALL.cavity - 6)} cy={WALL_CAV.top + 10 + c.b * (WALL_CAV.bottom - WALL_CAV.top - 20)} r={2 + c.c * 4} fill="#C6A672" opacity="0.45" />
            ))}
          </g>
        ))}
      </g>

      {/* ================= Foam: underfloor, under the bearers ============== */}
      <g data-h-foam="floor" clipPath="url(#h-clip-floor)">
        <rect x={ROOM.x} y={FOAM_FLOOR.y} width={ROOM.w} height={FOAM_FLOOR.h} fill={C.foam} />
        {cells.slice(44, 66).map((c, i) => (
          <circle key={`ff-${i}`} cx={ROOM.x + 10 + c.a * (ROOM.w - 20)} cy={FOAM_FLOOR.y + 4 + c.b * 12} r={2 + c.c * 4} fill="#C6A672" opacity="0.45" />
        ))}
      </g>

      {/* ================= Wall construction ================= */}
      {[L.outer, R.cav].map((x) => (
        <g key={`leaf-${x}`}>
          <rect x={x} y={ROOF.eaveY} width={WALL.leafOuter} height={SLAB.y - ROOF.eaveY} fill={C.brick} />
          {/* Coursing. */}
          {Array.from({ length: 18 }, (_, i) => (
            <rect key={i} x={x} y={ROOF.eaveY + 8 + i * 17} width={WALL.leafOuter} height="1.5" fill={C.brickLine} opacity="0.8" />
          ))}
        </g>
      ))}
      {[L.lining, R.inner].map((x) => (
        <rect key={`lin-${x}`} x={x} y={ROOF.eaveY} width={WALL.lining} height={SLAB.y - ROOF.eaveY} fill={C.lining} />
      ))}
      {/* Noggins across each cavity, so the foam has framing to fill around. */}
      {[L.cav, R.lining].map((x) =>
        [300, 400].map((y) => (
          <rect key={`nog-${x}-${y}`} x={x} y={y} width={WALL.cavity} height="9" fill={C.timberDark} opacity="0.9" />
        )),
      )}

      {/* ================= Ceiling, floors, slab ================= */}
      <rect x={L.outer} y={CEIL.y} width={OUT.right - OUT.left} height={CEIL.h} fill={C.lining} />
      <rect x={L.outer} y={FLOORS.midTop} width={OUT.right - OUT.left} height={FLOORS.midH} fill={C.slab} />
      <rect x={L.outer} y={SLAB.y} width={OUT.right - OUT.left} height={SLAB.h} fill={C.slab} />
      {/* Joist ends, read as structure inside both floor bands. */}
      {Array.from({ length: 15 }, (_, i) => {
        const x = L.outer + 24 + i * 42
        return (
          <g key={`joist-${i}`} fill={C.timberDark} opacity="0.55">
            <rect x={x} y={FLOORS.midTop + 3} width="10" height={FLOORS.midH - 6} />
            <rect x={x} y={SLAB.y + 3} width="10" height={SLAB.h - 6} />
          </g>
        )
      })}

      {/* ================= Chimney, behind the roof ================= */}
      <rect x="556" y="60" width="42" height="150" fill={C.brick} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={`ch-${i}`} x="556" y={70 + i * 16} width="42" height="1.5" fill={C.brickLine} opacity="0.8" />
      ))}
      <rect x="548" y="52" width="58" height="16" rx="3" fill={C.roofDark} />

      {/* ================= Roof ================= */}
      <path d={`M${ROOF.apexX} ${ROOF.apexY} L${ROOF.eaveR} ${ROOF.eaveY} L${ROOF.eaveR - 26} ${ROOF.eaveY} L${ROOF.apexX} ${APEX_IN} Z`} fill={C.roofDark} />
      <path d={`M${ROOF.apexX} ${ROOF.apexY} L${ROOF.eaveL} ${ROOF.eaveY} L${ROOF.eaveL + 26} ${ROOF.eaveY} L${ROOF.apexX} ${APEX_IN} Z`} fill={C.roof} />
      <rect x={ROOF.apexX - 16} y={ROOF.apexY - 4} width="32" height="12" rx="4" fill={C.ridge} />
      {/* Fascia at each eave, so the roof terminates in something. */}
      <rect x={ROOF.eaveL - 2} y={ROOF.eaveY} width="30" height="10" rx="2" fill={C.ridge} />
      <rect x={ROOF.eaveR - 28} y={ROOF.eaveY} width="30" height="10" rx="2" fill={C.ridge} />

      {/* ================= Windows and door ================= */}
      {[
        { x: 190, y: 268, w: 96, h: 62 },
        { x: 474, y: 268, w: 96, h: 62 },
        { x: 190, y: 398, w: 96, h: 62 },
      ].map((win) => (
        <g key={`${win.x}-${win.y}`}>
          <rect x={win.x} y={win.y} width={win.w} height={win.h} fill={C.glass} />
          <rect data-h-glow x={win.x} y={win.y} width={win.w} height={win.h} fill={C.glassWarm} opacity="0" />
          <rect x={win.x} y={win.y} width={win.w} height={win.h} fill="none" stroke={C.lining} strokeWidth="5" />
          <line x1={win.x + win.w / 2} y1={win.y} x2={win.x + win.w / 2} y2={win.y + win.h} stroke={C.lining} strokeWidth="4" />
          {/* Sill */}
          <rect x={win.x - 6} y={win.y + win.h} width={win.w + 12} height="7" rx="2" fill={C.lining} />
        </g>
      ))}
      <rect x="486" y="392" width="72" height={FLOORS.groundBottom - 392} fill="#6B4838" />
      <rect x="486" y="392" width="72" height={FLOORS.groundBottom - 392} fill="none" stroke={C.lining} strokeWidth="4" />
      <circle cx="546" cy={FLOORS.groundBottom - 44} r="4" fill={C.lining} />

      {/* ================= Subfloor: bearers, piers, footings ============== */}
      {/* Bearer the foam and floor sit on. */}
      <rect x={L.outer} y={SUB.top} width={OUT.right - OUT.left} height="10" fill={C.timberDark} />
      {[150, 290, 430, 570].map((x) => (
        <g key={`pier-${x}`}>
          {/* Pier down into the ground, and a footing bedded in the soil. */}
          <rect x={x} y={SUB.top + 10} width={26} height={GROUND_Y - SUB.top - 10} fill={C.pier} />
          <rect x={x - 7} y={GROUND_Y} width={40} height="14" rx="2" fill="#4E352A" />
        </g>
      ))}

      {/* ================= Escaping warmth ================= */}
      {gust('roof', [
        { x: 250, y: 118, r: -90 },
        { x: 318, y: 88, r: -90 },
        { x: 392, y: 74, r: -90, s: 1.15 },
        { x: 462, y: 92, r: -90 },
        { x: 520, y: 126, r: -90 },
      ])}
      {/* Started just clear of each outer leaf and travelling only as far as
          the canvas edge, so the whole of the motion is on screen. */}
      {gust('wall', [
        { x: 52, y: 268, r: 180 },
        { x: 52, y: 336, r: 180 },
        { x: 52, y: 414, r: 180 },
        { x: 708, y: 268, r: 0 },
        { x: 708, y: 336, r: 0 },
        { x: 708, y: 414, r: 0 },
      ])}
      {gust('floor', [
        { x: 236, y: 540, r: 90 },
        { x: 380, y: 540, r: 90 },
        { x: 524, y: 540, r: 90 },
      ])}
    </svg>
  )
}
