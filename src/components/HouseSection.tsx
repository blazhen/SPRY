import { useMemo } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
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

/*
  The drawing is authored in a 760x600 space, but the visible frame is cropped
  to what is actually drawn. Empty sky above the ridge and soil texture below
  the footing were pure cost: the scene fits to height, so every unused vertical
  unit made the whole house smaller.
*/
const VB = { w: 760, h: 600, crop: { top: 12, bottom: 30 } }

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
/*
  The wall cavity foam starts just under the eave, not at the ceiling line.

  It used to begin at CEIL.y (228) while the roof band ends around 197 to 207
  at the eaves, depending where the slope is measured, which left a small
  unfilled notch at each top corner once the house was sealed. Starting at the
  eave tucks the wall foam under the roof band across the whole cavity width,
  and the overlap is invisible because both are the same colour.

  The cavity really does run this high in the building: the outer leaves start
  at the eave too.
*/
const WALL_CAV = { top: ROOF.eaveY + 4, bottom: SLAB.y }

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

export type HouseSeason = 'summer' | 'winter'

/**
 * Interior temperature colours. Literal, not palette tokens: hot has to read
 * hot in every colour scheme, and in the brand palette the accent is navy.
 */
const HOT = '#E0452A'
const COLD = '#2E7BD6'

/** Warm and cool ambient light for the scene. */
const CAST_WARM = '#FFB067'
const CAST_COOL = '#7FA8D4'

/**
 * How long a season takes to turn over.
 *
 * Long on purpose. The seasons used to cut instantly, which read as a glitch
 * rather than as weather. Everything seasonal transitions over this same
 * duration so the whole scene turns together.
 */
const SEASON_FADE = '2.2s'

export default function HouseSection({
  className = '',
  season = 'summer',
}: {
  className?: string
  season?: HouseSeason
}) {
  const reduced = useReducedMotion()

  // Summer: hot inside, sealed to cool. Winter: cold inside, sealed to warm.
  const startColor = season === 'summer' ? HOT : COLD
  const endColor = season === 'summer' ? COLD : HOT
  const castColor = season === 'summer' ? CAST_WARM : CAST_COOL
  const isWinter = season === 'winter'

  /** Deterministic flake positions, so the scene never reshuffles on re-render. */
  const flakes = useMemo(() => {
    let seed = 4471
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    return Array.from({ length: 34 }, () => ({
      x: rand() * VB.w,
      y: rand() * VB.h,
      r: 1.6 + rand() * 2.4,
      o: 0.35 + rand() * 0.5,
      dur: 6 + rand() * 7,
      delay: -rand() * 10,
    }))
  }, [])

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
    <svg
      data-house
      viewBox={`0 ${VB.crop.top} ${VB.w} ${VB.h - VB.crop.top - VB.crop.bottom}`}
      className={className}
      role="img"
      aria-label={heroHouse.diagramLabel}
    >
      <defs>
        <clipPath id="h-clip-roof">
          <rect data-h-clip="roof" x={ROOF.eaveL} y={ROOF.apexY} width={ROOF.eaveR - ROOF.eaveL} height={ROOF.eaveY - ROOF.apexY + 40} />
        </clipPath>
        <clipPath id="h-clip-wall">
          <rect data-h-clip="wall" x={0} y={WALL_CAV.top} width={VB.w} height={WALL_CAV.bottom - WALL_CAV.top} />
        </clipPath>
        <clipPath id="h-clip-floor">
          <rect data-h-clip="floor" x={OUT.left} y={FOAM_FLOOR.y} width={OUT.right - OUT.left} height={FOAM_FLOOR.h} />
        </clipPath>
        {/*
          The interior tints and the ambient cast animate their stop colours
          rather than swapping between two fixed gradients. Swapping a fill from
          one gradient URL to another cannot be transitioned, so the season
          changed in a single frame; `stop-color` is an animatable property, so
          this interpolates red to blue properly.
        */}
        <linearGradient id="h-tint-start" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopOpacity="0.52" style={{ stopColor: startColor, transition: `stop-color ${SEASON_FADE} ease` }} />
          <stop offset="100%" stopOpacity="0.10" style={{ stopColor: startColor, transition: `stop-color ${SEASON_FADE} ease` }} />
        </linearGradient>
        <linearGradient id="h-tint-end" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopOpacity="0.52" style={{ stopColor: endColor, transition: `stop-color ${SEASON_FADE} ease` }} />
          <stop offset="100%" stopOpacity="0.10" style={{ stopColor: endColor, transition: `stop-color ${SEASON_FADE} ease` }} />
        </linearGradient>

        {/*
          Ambient light, as a radial wash that reaches nothing at the edges.
          It used to be a plain full-canvas rect, which drew a hard rectangle
          around the scene and made the whole thing read as a cube sitting on
          the page.
        */}
        <radialGradient id="h-cast" cx="50%" cy="46%" r="74%">
          <stop offset="0%" stopOpacity="0.20" style={{ stopColor: castColor, transition: `stop-color ${SEASON_FADE} ease` }} />
          <stop offset="62%" stopOpacity="0.09" style={{ stopColor: castColor, transition: `stop-color ${SEASON_FADE} ease` }} />
          <stop offset="100%" stopOpacity="0" style={{ stopColor: castColor, transition: `stop-color ${SEASON_FADE} ease` }} />
        </radialGradient>

        {/* Softens the ground's left and right ends into the page. */}
        <linearGradient id="h-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" />
          <stop offset="9%" stopColor="#fff" />
          <stop offset="91%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </linearGradient>
        <mask id="h-edge-mask">
          <rect x="0" y="0" width={VB.w} height={VB.h} fill="url(#h-edge)" />
        </mask>

        <radialGradient id="h-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD79A" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFD79A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="h-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.soil} />
          <stop offset="100%" stopColor={C.soilDeep} />
        </linearGradient>
      </defs>

      {/* ================= Ground, drawn first so the house sits on it ====== */}
      <rect x="0" y={GROUND_Y} width={VB.w} height={VB.h - GROUND_Y} fill="url(#h-soil)" mask="url(#h-edge-mask)" />
      <rect x="0" y={GROUND_Y} width={VB.w} height="5" fill={C.turf} mask="url(#h-edge-mask)" />
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

      {/*
        The interior starts at the temperature the season inflicts on it and
        ends at the one you actually want. In summer that is hot to cool; in
        winter, cold to warm. Same foam, opposite problems, which is the whole
        argument of the section in one colour change.
      */}
      <g data-h-tint-start opacity="1">
        <rect x={ROOM.x} y={FLOORS.upperTop} width={ROOM.w} height={FLOORS.midTop - FLOORS.upperTop} fill="url(#h-tint-start)" />
        <rect x={ROOM.x} y={FLOORS.groundTop} width={ROOM.w} height={FLOORS.groundBottom - FLOORS.groundTop} fill="url(#h-tint-start)" />
      </g>
      <g data-h-tint-end opacity="0">
        <rect x={ROOM.x} y={FLOORS.upperTop} width={ROOM.w} height={FLOORS.midTop - FLOORS.upperTop} fill="url(#h-tint-end)" />
        <rect x={ROOM.x} y={FLOORS.groundTop} width={ROOM.w} height={FLOORS.groundBottom - FLOORS.groundTop} fill="url(#h-tint-end)" />
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

      {/* ================= Subfloor void ==================================== */}
      {/*
        The crawl space, drawn as a real shadowed cavity spanning the full width
        of the house.

        Without this the band between the floor and the bearer was simply empty:
        the underfloor foam that occupies it is scaled to nothing until the
        visitor seals the house, so in the opening state the page background
        showed straight through and the building appeared to hover above its own
        foundation. It also never reached the outer leaves, so a strip at each
        end stayed transparent even once the foam was in.

        A dark void is the honest picture anyway. An uninsulated suspended floor
        sits over open, moving air, which is the whole reason the floor is cold.
      */}
      <rect
        x={OUT.left}
        y={FOAM_FLOOR.y}
        width={OUT.right - OUT.left}
        height={FOAM_FLOOR.h}
        fill={C.soilDeep}
      />
      {/* Shadow under the floor, so the void has depth rather than being flat. */}
      <rect
        x={OUT.left}
        y={FOAM_FLOOR.y}
        width={OUT.right - OUT.left}
        height="5"
        fill="#000"
        opacity="0.35"
      />

      {/* ================= Foam: underfloor, under the bearers ============== */}
      <g data-h-foam="floor" clipPath="url(#h-clip-floor)">
        <rect x={OUT.left} y={FOAM_FLOOR.y} width={OUT.right - OUT.left} height={FOAM_FLOOR.h} fill={C.foam} />
        {cells.slice(44, 66).map((c, i) => (
          <circle key={`ff-${i}`} cx={OUT.left + 10 + c.a * (OUT.right - OUT.left - 20)} cy={FOAM_FLOOR.y + 4 + c.b * 12} r={2 + c.c * 4} fill="#C6A672" opacity="0.45" />
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

      {/* ================= Subfloor: bearer and foundation ================= */}
      {/*
        This was four separate piers under a bearer that ran the full width of
        the house. The outer 90 pixels at each end had nothing beneath them and
        the gaps between piers showed bare soil straight through, so the whole
        building read as hovering above the ground.

        It is now a continuous foundation wall: no gaps, supported end to end,
        and carried a little below the turf line so it is visibly bedded into
        the earth rather than resting on top of it.
      */}
      {/* Bearer the floor and its foam sit on. */}
      <rect x={L.outer} y={SUB.top} width={OUT.right - OUT.left} height="10" fill={C.timberDark} />

      {/* Footing, splayed slightly wider than the wall above and set into soil. */}
      <rect
        x={OUT.left - 8}
        y={GROUND_Y - 6}
        width={OUT.right - OUT.left + 16}
        height="18"
        rx="2"
        fill="#4E352A"
      />

      {/* Foundation wall, full width and unbroken. */}
      <rect
        x={OUT.left}
        y={SUB.top + 10}
        width={OUT.right - OUT.left}
        height={GROUND_Y - SUB.top - 10 + 6}
        fill={C.pier}
      />

      {/* Coursing, so the foundation reads as masonry and not a plain bar. */}
      {[0, 1].map((row) => (
        <line
          key={`course-${row}`}
          x1={OUT.left}
          x2={OUT.right}
          y1={SUB.top + 17 + row * 8}
          y2={SUB.top + 17 + row * 8}
          stroke={C.brickLine}
          strokeWidth="1.5"
          opacity="0.55"
        />
      ))}

      {/* Pilasters where the old piers stood, keeping the structural rhythm. */}
      {[150, 290, 430, 570].map((x) => (
        <rect
          key={`pilaster-${x}`}
          x={x}
          y={SUB.top + 10}
          width={26}
          height={GROUND_Y - SUB.top - 10 + 6}
          fill="#7A5240"
        />
      ))}

      {/* ================= Weather ==========================================
        Added in front of the building rather than woven into it: the house
        itself is untouched, the season only changes what is happening around
        and inside it.
      */}
      <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
        {/* Ambient light. One wash whose colour interpolates with the season. */}
        <rect x="0" y="0" width={VB.w} height={VB.h} fill="url(#h-cast)" />

        {/* Winter. Present at all times, faded out when it is not winter, so
            the turnover is a dissolve rather than a cut. */}
        <g style={{ opacity: isWinter ? 1 : 0, transition: `opacity ${SEASON_FADE} ease` }}>
          {/* Falling snow is skipped under reduced motion: the global stylesheet
              flattens animations, and a flake frozen mid-air reads as a bug. */}
          {!reduced &&
            flakes.map((f, i) => (
              <circle
                key={`snow-${i}`}
                className="house-snow"
                cx={f.x}
                cy={f.y}
                r={f.r}
                fill="#EAF2FA"
                opacity={f.o}
                style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
              />
            ))}
          <rect
            x="0"
            y={GROUND_Y}
            width={VB.w}
            height="5"
            fill="#C9D8E4"
            opacity="0.85"
            mask="url(#h-edge-mask)"
          />
        </g>

        {/* Summer. */}
        <g style={{ opacity: isWinter ? 0 : 1, transition: `opacity ${SEASON_FADE} ease` }}>
          <circle cx={VB.w - 96} cy="70" r="88" fill="url(#h-sun)" />
          <circle cx={VB.w - 96} cy="70" r="22" fill="#FFD79A" opacity="0.55" />
          {!reduced &&
            [250, 330, 430, 510].map((x, i) => (
              <path
                key={`heat-${x}`}
                className="house-heat"
                d={`M${x} 150 c8 -7 18 -7 26 0 5 4 12 4 17 0`}
                fill="none"
                stroke="#FFB570"
                strokeWidth="3"
                strokeLinecap="round"
                style={{ animationDuration: `${3.4 + i * 0.5}s`, animationDelay: `${-i * 0.9}s` }}
              />
            ))}
        </g>
      </g>

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
