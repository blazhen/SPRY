import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

export type HeroObjectKind = 'house' | 'warehouse' | 'foam'

/**
 * The one value that cycles on a timer.
 *
 * For the two buildings it is literally the season. The foam sample has no
 * seasons, so it reads the same flag as its own two states: `summer` is open
 * cell, `winter` is closed cell. Sharing the flag keeps one timer, one
 * transition and one caption mechanism across all three objects rather than
 * growing a parallel system for the third.
 */
export type Season = 'summer' | 'winter'

export interface HeroObjectProps {
  kind: HeroObjectKind
  season: Season
  reducedMotion?: boolean
}

/**
 * A building, in summer and in winter.
 *
 * MATERIALS ARE FIXED, not themed. An earlier version drove every surface from
 * the site palette, which meant the building changed colour with the colour
 * scheme and, on the light theme, rendered as a pale blob. A building should
 * look like a building: colorbond, render, brick and glass are real colours and
 * they read as real whatever the page around them is doing. The only things
 * that change here are the light and the weather.
 *
 * The seasonal swap is the argument the whole site makes, in one object: the
 * same foam holds heat in through a Melbourne winter and keeps it out in
 * February. Winter brings low cold light, snow on the roof and falling flakes;
 * summer brings warm high sun, dry grass and heat rising off the sheeting.
 *
 * Everything is procedural, so there is no model or texture to download.
 */

/* ------------------------------------------------------------- Materials */

const MAT = {
  render: '#DED7C9', // painted render
  brick: '#9C6B52',
  roofTile: '#4A4E57', // charcoal colorbond
  timber: '#7A5A3C',
  glass: '#5B6E7D',
  foam: '#F0E4C2', // cured spray foam, a pale cream
  foamOpen: '#FBF2DE', // open cell, lighter and softer
  foamClosed: '#F0DDB2', // closed cell, denser and warmer
  colorbondWall: '#8E969E',
  colorbondRoof: '#464C54',
  door: '#6E7780',
  concrete: '#A9A69F',
  grassSummer: '#79814F',
  grassWinter: '#9AA7AE',
  snow: '#EDF2F6',
} as const

const SEASONS: Record<
  Season,
  {
    key: string
    keyIntensity: number
    ambient: string
    ambientIntensity: number
    ground: string
    snow: number
  }
> = {
  summer: {
    key: '#FFE3B0',
    keyIntensity: 1.35,
    ambient: '#CFE3F5',
    ambientIntensity: 0.55,
    ground: MAT.grassSummer,
    snow: 0,
  },
  winter: {
    key: '#DCE9F7',
    keyIntensity: 1.15,
    ambient: '#C6D6E6',
    ambientIntensity: 0.75,
    ground: MAT.grassWinter,
    snow: 1,
  },
}

/* --------------------------------------------------------------- Weather */

/**
 * Falling snow in winter, rising heat shimmer in summer.
 *
 * One Points object either way, so the swap costs nothing: only the colour,
 * the direction of travel and the opacity change.
 */
function Weather({ season, reduced }: { season: Season; reduced: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const COUNT = 220

  const positions = useMemo(() => {
    const a = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      a[i * 3] = (Math.random() - 0.5) * 7
      a[i * 3 + 1] = Math.random() * 5
      a[i * 3 + 2] = (Math.random() - 0.5) * 5
    }
    return a
  }, [])

  const opacity = useRef(0)

  useFrame((_, delta) => {
    const points = ref.current
    if (!points) return
    const attr = points.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const mat = points.material as THREE.PointsMaterial

    // Ease visibility so a season change dissolves rather than cuts.
    const target = season === 'winter' ? 0.9 : 0.3
    opacity.current += (target - opacity.current) * Math.min(1, delta * 2.2)
    mat.opacity = opacity.current
    mat.color.set(season === 'winter' ? MAT.snow : '#FFC489')
    mat.size = season === 'winter' ? 0.055 : 0.035

    if (reduced) return
    for (let i = 0; i < COUNT; i++) {
      const y = i * 3 + 1
      if (season === 'winter') {
        arr[y] -= delta * (0.35 + (i % 5) * 0.05)
        arr[i * 3] += Math.sin(arr[y] * 2 + i) * delta * 0.06
        if (arr[y] < -0.9) arr[y] = 5
      } else {
        arr[y] += delta * (0.5 + (i % 5) * 0.06)
        if (arr[y] > 5) arr[y] = 0.6
      }
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial transparent depthWrite={false} sizeAttenuation opacity={0} />
    </points>
  )
}

/* ---------------------------------------------------------------- Ground */

/**
 * Ground that fades out at its rim.
 *
 * A plain circle rendered as a hard-edged disc sitting on the page, which read
 * as a green pancake rather than as ground. A radial alpha map dissolves the
 * edge into the section behind it, so the building stands on something without
 * the scene announcing where it stops.
 */
function useFadeTexture() {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.5, '#d8d8d8')
    g.addColorStop(1, '#000000')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])
}

function Ground({ season }: { season: Season }) {
  const ref = useRef<THREE.Mesh>(null)
  const target = useMemo(() => new THREE.Color(SEASONS[season].ground), [season])
  const fade = useFadeTexture()

  useFrame((_, delta) => {
    const mat = ref.current?.material as THREE.MeshStandardMaterial | undefined
    if (mat) mat.color.lerp(target, Math.min(1, delta * 2))
  })

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.86, 0]} receiveShadow>
      <circleGeometry args={[3.6, 64]} />
      <meshStandardMaterial
        color={MAT.grassSummer}
        roughness={1}
        transparent
        alphaMap={fade ?? undefined}
        depthWrite={false}
      />
    </mesh>
  )
}

/** Snow lying on a flat surface. Grows in depth and melts away. */
function SnowSlab({
  position,
  args,
  season,
}: {
  position: [number, number, number]
  args: [number, number, number]
  season: Season
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    const m = ref.current
    if (!m) return
    m.scale.y += (SEASONS[season].snow - m.scale.y) * Math.min(1, delta * 3)
    m.visible = m.scale.y > 0.02
  })
  return (
    <mesh ref={ref} position={position} scale={[1, 0, 1]}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={MAT.snow} roughness={0.9} />
    </mesh>
  )
}

/**
 * Snow on a pitched roof.
 *
 * A shell that follows the roof's own cone rather than a box laid over it: a
 * slab on a pitch reads as a separate object hovering above the house. It
 * fades in instead of growing, because scaling a cone would alter its pitch
 * rather than the depth of snow on it.
 */
function SnowPitched({
  position,
  args,
  season,
  rotation,
}: {
  position: [number, number, number]
  args: [number, number, number]
  season: Season
  rotation?: [number, number, number]
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    const m = ref.current
    if (!m) return
    const mat = m.material as THREE.MeshStandardMaterial
    mat.opacity += (SEASONS[season].snow - mat.opacity) * Math.min(1, delta * 2.5)
    m.visible = mat.opacity > 0.02
  })
  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <coneGeometry args={[args[0], args[1], 4]} />
      <meshStandardMaterial color={MAT.snow} roughness={0.9} transparent opacity={0} flatShading />
    </mesh>
  )
}

/* ------------------------------------------------------------- Buildings */

function House({ season }: { season: Season }) {
  return (
    <group position={[0, -0.35, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.9, 1, 1.5]} />
        <meshStandardMaterial color={MAT.render} roughness={0.9} flatShading />
      </mesh>

      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[1.94, 0.16, 1.54]} />
        <meshStandardMaterial color={MAT.brick} roughness={0.95} />
      </mesh>

      {/* Cured foam in the wall cavity, showing on the cut edge */}
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[1.94, 0.16, 1.54]} />
        <meshStandardMaterial color={MAT.foam} roughness={0.75} />
      </mesh>

      {/* Gable roof: a four-sided cone is a pyramid, turned to sit square */}
      <mesh castShadow position={[0, 1.32, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.45, 0.78, 4]} />
        <meshStandardMaterial color={MAT.roofTile} roughness={0.85} flatShading />
      </mesh>
      <SnowPitched
        position={[0, 1.33, 0]}
        rotation={[0, Math.PI / 4, 0]}
        args={[1.47, 0.79, 0]}
        season={season}
      />

      <mesh castShadow position={[0.62, 1.48, 0.2]}>
        <boxGeometry args={[0.2, 0.62, 0.2]} />
        <meshStandardMaterial color={MAT.brick} roughness={0.9} />
      </mesh>

      <mesh position={[-0.45, 0.55, 0.76]}>
        <boxGeometry args={[0.5, 0.4, 0.04]} />
        <meshStandardMaterial color={MAT.glass} roughness={0.15} metalness={0.1} />
      </mesh>
      <mesh position={[0.55, 0.55, 0.76]}>
        <boxGeometry args={[0.42, 0.4, 0.04]} />
        <meshStandardMaterial color={MAT.glass} roughness={0.15} metalness={0.1} />
      </mesh>
      <mesh position={[0.05, 0.3, 0.76]}>
        <boxGeometry args={[0.32, 0.56, 0.04]} />
        <meshStandardMaterial color={MAT.timber} roughness={0.8} />
      </mesh>

      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[1.9, 0.12, 1.5]} />
        <meshStandardMaterial color={MAT.foam} roughness={0.75} />
      </mesh>
    </group>
  )
}

function Warehouse({ season }: { season: Season }) {
  const bays = [-1.05, -0.35, 0.35, 1.05]
  return (
    <group position={[0, -0.35, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[3.1, 1.2, 1.5]} />
        <meshStandardMaterial
          color={MAT.colorbondWall}
          roughness={0.7}
          metalness={0.2}
          flatShading
        />
      </mesh>

      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[3.16, 0.12, 1.56]} />
        <meshStandardMaterial color={MAT.concrete} roughness={1} />
      </mesh>

      {/* Sprayed underside of the roof sheeting */}
      <mesh position={[0, 1.16, 0]}>
        <boxGeometry args={[3.14, 0.14, 1.54]} />
        <meshStandardMaterial color={MAT.foam} roughness={0.75} />
      </mesh>

      <mesh castShadow position={[0, 1.3, 0]}>
        <boxGeometry args={[3.24, 0.14, 1.64]} />
        <meshStandardMaterial color={MAT.colorbondRoof} roughness={0.65} metalness={0.25} />
      </mesh>
      <SnowSlab position={[0, 1.4, 0]} args={[3.2, 0.16, 1.6]} season={season} />

      {bays.map((x) => (
        <mesh key={x} position={[x, 0.6, 0.77]}>
          <boxGeometry args={[0.07, 1.16, 0.05]} />
          <meshStandardMaterial color={MAT.colorbondRoof} roughness={0.7} />
        </mesh>
      ))}

      <mesh position={[0, 0.36, 0.78]}>
        <boxGeometry args={[0.9, 0.68, 0.05]} />
        <meshStandardMaterial color={MAT.door} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[1.28, 0.3, 0.78]}>
        <boxGeometry args={[0.26, 0.56, 0.04]} />
        <meshStandardMaterial color={MAT.colorbondRoof} roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ----------------------------------------------------------------- Scene */

function Sun({ season, reduced }: { season: Season; reduced: boolean }) {
  const key = useRef<THREE.DirectionalLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const targetKey = useMemo(() => new THREE.Color(SEASONS[season].key), [season])
  const targetAmb = useMemo(() => new THREE.Color(SEASONS[season].ambient), [season])

  useFrame((state, delta) => {
    const k = Math.min(1, delta * 2)
    if (key.current) {
      key.current.color.lerp(targetKey, k)
      key.current.intensity += (SEASONS[season].keyIntensity - key.current.intensity) * k
      // Winter sun sits lower in the sky.
      const targetY = season === 'winter' ? 3.2 : 6.4
      key.current.position.y += (targetY - key.current.position.y) * k
      if (!reduced) {
        key.current.position.x = 4.5 + Math.sin(state.clock.elapsedTime * 0.15) * 0.6
      }
    }
    if (amb.current) {
      amb.current.color.lerp(targetAmb, k)
      amb.current.intensity += (SEASONS[season].ambientIntensity - amb.current.intensity) * k
    }
  })

  return (
    <>
      <ambientLight ref={amb} intensity={0.55} />
      <directionalLight ref={key} position={[4.5, 6.4, 3.4]} intensity={1.35} castShadow />
      <directionalLight position={[-4, 2.4, -3]} intensity={0.28} color="#AFC6DC" />
    </>
  )
}

/* -------------------------------------------------------- Foam cell sample */

/**
 * Deterministic PRNG. The packing has to land in the same place on every render
 * and every visit; Math.random would reshuffle the bubbles whenever React
 * re-rendered the scene, which reads as a glitch rather than as foam.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Cell {
  p: [number, number, number]
  r: number
}

/**
 * Packs bubbles into a cube by rejection sampling.
 *
 * Not a lattice: evenly spaced spheres read as a crystal, and the whole point of
 * the object is that one foam is coarse and open and the other is fine and
 * packed. The 0.6 overlap factor lets neighbours interpenetrate the way real
 * cells do, sharing walls; anything near 1 leaves them touching at a point and
 * the mass reads as a bag of marbles rather than as foam.
 */
function packCells(count: number, seed: number, minR: number, maxR: number): Cell[] {
  const rand = mulberry32(seed)
  const HALF = 0.7
  const cells: Cell[] = []
  for (let guard = 0; guard < count * 90 && cells.length < count; guard++) {
    const r = minR + rand() * (maxR - minR)
    const span = HALF - r * 0.4
    const p: [number, number, number] = [
      (rand() - 0.5) * 2 * span,
      (rand() - 0.5) * 2 * span,
      (rand() - 0.5) * 2 * span,
    ]
    let clear = true
    for (const c of cells) {
      if (Math.hypot(c.p[0] - p[0], c.p[1] - p[1], c.p[2] - p[2]) < (c.r + r) * 0.6) {
        clear = false
        break
      }
    }
    if (clear) cells.push({ p, r })
  }
  return cells
}

/*
  R3F constructs the mesh from its args prop and then attaches the geometry and
  material declared as children, so the first two constructor arguments are
  deliberately absent. The casts exist only to say that to TypeScript.
*/
const LATE_GEOMETRY = undefined as unknown as THREE.BufferGeometry
const LATE_MATERIAL = undefined as unknown as THREE.Material

/**
 * One instanced mesh per structure, so a hundred and fifty bubbles cost a single
 * draw call rather than a hundred and fifty.
 */
function CellCloud({
  cells,
  color,
  roughness,
  groupRef,
  matRef,
}: {
  cells: Cell[]
  color: string
  roughness: number
  groupRef: React.RefObject<THREE.Group>
  matRef: React.RefObject<THREE.MeshStandardMaterial>
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const target = mesh.current
    if (!target) return
    const m = new THREE.Matrix4()
    // A per-cell tint, multiplied over the material colour. Without it every
    // bubble is the same value and a hundred identical spheres read as plastic
    // beads; real foam has darker cells sitting behind brighter ones.
    const tint = new THREE.Color()
    const shade = mulberry32(0x9e3779b9)
    cells.forEach((c, i) => {
      m.makeScale(c.r, c.r, c.r)
      m.setPosition(c.p[0], c.p[1], c.p[2])
      target.setMatrixAt(i, m)
      const v = 0.88 + shade() * 0.12
      tint.setRGB(v, v * 0.995, v * 0.975)
      target.setColorAt(i, tint)
    })
    target.instanceMatrix.needsUpdate = true
    if (target.instanceColor) target.instanceColor.needsUpdate = true
  }, [cells])

  return (
    <group ref={groupRef}>
      <instancedMesh ref={mesh} args={[LATE_GEOMETRY, LATE_MATERIAL, cells.length]}>
        <sphereGeometry args={[1, 14, 12]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          roughness={roughness}
          metalness={0}
          transparent
        />
      </instancedMesh>
    </group>
  )
}

/**
 * A block of foam, cut open.
 *
 * This is the Spray Foam page's hero, and it deliberately is not a building: the
 * house belongs to Residential, the warehouse to Commercial, and an interactive
 * wall already sits further down this same page. What this page opens with
 * instead is the thing it spends the rest of its length explaining, the
 * difference between the two foams, stated before a word of copy.
 *
 * Open cell is coarse, soft and light. Closed cell is fine, dense and packed.
 * The two structures cross-dissolve rather than cut, so the change reads as one
 * material becoming the other.
 */
function FoamSample({ closed }: { closed: boolean }) {
  const openCells = useMemo(() => packCells(60, 0x5be47, 0.17, 0.32), [])
  const closedCells = useMemo(() => packCells(260, 0x1c0ed, 0.075, 0.145), [])

  const openGroup = useRef<THREE.Group>(null)
  const closedGroup = useRef<THREE.Group>(null)
  const openMat = useRef<THREE.MeshStandardMaterial>(null)
  const closedMat = useRef<THREE.MeshStandardMaterial>(null)

  // 0 = open cell, 1 = closed cell. Started at its resting value so a visitor
  // under reduced motion, where the flag never flips, sees a finished object
  // rather than one easing in from the wrong state.
  const mix = useRef(closed ? 1 : 0)

  useFrame((_, delta) => {
    const target = closed ? 1 : 0
    mix.current += (target - mix.current) * Math.min(1, delta * 2.4)
    const k = mix.current

    if (openMat.current) openMat.current.opacity = 1 - k
    if (closedMat.current) closedMat.current.opacity = k

    // The outgoing structure shrinks slightly as it goes, so the coarse foam
    // looks like it is condensing into the fine one rather than simply fading.
    if (openGroup.current) {
      openGroup.current.scale.setScalar(0.84 + 0.16 * (1 - k))
      openGroup.current.visible = k < 0.995
    }
    if (closedGroup.current) {
      closedGroup.current.scale.setScalar(0.84 + 0.16 * k)
      closedGroup.current.visible = k > 0.005
    }
  })

  return (
    <group>
      <CellCloud
        cells={openCells}
        color={MAT.foamOpen}
        roughness={0.95}
        groupRef={openGroup}
        matRef={openMat}
      />
      <CellCloud
        cells={closedCells}
        color={MAT.foamClosed}
        roughness={0.55}
        groupRef={closedGroup}
        matRef={closedMat}
      />
    </group>
  )
}

/**
 * Neutral studio light for the foam, rather than the seasonal rig.
 *
 * The buildings change light with the season because that is the argument they
 * make. The foam's flag means open against closed, so lighting it with winter's
 * cold blue would say something the object does not mean.
 */
function FoamLights() {
  return (
    <>
      <ambientLight intensity={0.62} color="#F4EFE4" />
      <directionalLight position={[3.4, 4.4, 3.6]} intensity={1.9} color="#FFF6E6" />
      <directionalLight position={[-3.2, 1.4, -2.6]} intensity={0.5} color="#C8D8EA" />
      {/* Rim light from behind, so the bubbles on the silhouette separate from
          the page instead of dissolving into it. */}
      <directionalLight position={[-1.6, 2.2, -4.2]} intensity={0.85} color="#FFE9C4" />
    </>
  )
}

function Spin({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (ref.current && !reduced) ref.current.rotation.y += delta * 0.14
  })
  return (
    <group ref={ref} rotation={[0, reduced ? -0.6 : 0, 0]}>
      {children}
    </group>
  )
}

/**
 * Camera framing per building.
 *
 * The warehouse is 3.1 units wide against the house's 1.9, and it turns, so at
 * 45 degrees its swept diagonal reaches about 3.5. Sharing a single camera is
 * what left it visibly clipped at the canvas edges. Each kind now gets a
 * distance that fits its own swept width with margin to spare.
 */
const CAMERA: Record<HeroObjectKind, { position: [number, number, number]; fov: number }> = {
  house: { position: [4.0, 2.7, 5.0], fov: 30 },
  warehouse: { position: [5.6, 3.4, 6.8], fov: 30 },
  // The foam block is small, but unlike the buildings it is centred on the
  // origin rather than standing on the ground, and it sweeps a 1.2 unit radius
  // as it turns.
  foam: { position: [2.6, 1.7, 3.0], fov: 30 },
}

/** Where the contact shadow falls, which is the base of each object. */
const SHADOW: Record<HeroObjectKind, { y: number; scale: number; blur: number }> = {
  house: { y: -0.84, scale: 11, blur: 2.8 },
  warehouse: { y: -0.84, scale: 11, blur: 2.8 },
  foam: { y: -1.02, scale: 4.4, blur: 2.2 },
}

export default function HeroObject({ kind, season, reducedMotion = false }: HeroObjectProps) {
  const isBuilding = kind !== 'foam'
  const shadow = SHADOW[kind]

  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.75]}
      shadows
      camera={CAMERA[kind]}
      style={{ background: 'transparent' }}
    >
      {isBuilding ? <Sun season={season} reduced={reducedMotion} /> : <FoamLights />}

      <Spin reduced={reducedMotion}>
        {kind === 'house' ? (
          <House season={season} />
        ) : kind === 'warehouse' ? (
          <Warehouse season={season} />
        ) : (
          <FoamSample closed={season === 'winter'} />
        )}
      </Spin>

      {/* Grass and weather belong to a building standing outside. A cut sample
          of foam is an object on a table, so it gets neither. */}
      {isBuilding && <Ground season={season} />}
      {isBuilding && <Weather season={season} reduced={reducedMotion} />}

      <ContactShadows
        position={[0, shadow.y, 0]}
        opacity={isBuilding ? (season === 'winter' ? 0.22 : 0.4) : 0.3}
        scale={shadow.scale}
        blur={shadow.blur}
        far={4.5}
        resolution={512}
      />
    </Canvas>
  )
}
