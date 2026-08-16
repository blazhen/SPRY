import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

/**
 * A section of insulated wall, cut open, that you can orbit freely.
 *
 * Two earlier attempts failed for instructive reasons, both fixed here:
 *
 *  1. Layers stacked along the depth axis and viewed head on, so the build-up
 *     was hidden behind the front face. Now every layer is a full-size slab and
 *     the internal lining has a rectangular inspection opening cut into it, so
 *     the cavity is visible through the hole and the whole stack is visible on
 *     the cut edges from any angle.
 *
 *  2. Heat particles drifted in front of the lining and read as confetti
 *     stuck to the surface. They are now confined to the opening in all three
 *     axes, so they are always spatially inside the wall and are correctly
 *     occluded by the lining frame around them.
 *
 * `mode` swaps the cavity between batts and spray foam. With batts the heat
 * finds the gaps and streams out; with foam it hits the cured face and is
 * turned back. Everything is procedural, so there is no asset to 404.
 */

// --- Dimensions ------------------------------------------------------------
const W = 1.35 // half width
const H = 1.15 // half height

const BRICK_FRONT = -0.24
const BRICK_DEPTH = 0.26
const CAVITY_BACK = -0.24
const CAVITY_FRONT = 0.16
const CAVITY_DEPTH = CAVITY_FRONT - CAVITY_BACK
const LINING_DEPTH = 0.08
const LINING_Z = CAVITY_FRONT + LINING_DEPTH / 2

const STUD_X = [-1.05, -0.35, 0.35, 1.05]
const STUD_HW = 0.07
const PLATE_H = 0.09

/** Openings between studs, where insulation sits. */
const BAYS = STUD_X.slice(0, -1).map((x, i) => {
  const left = x + STUD_HW
  const right = STUD_X[i + 1] - STUD_HW
  return { center: (left + right) / 2, width: right - left }
})
const BAY_TOP = H - PLATE_H * 2
const BAY_H = BAY_TOP * 2

/** The inspection opening cut into the internal lining. */
const CUT = { x0: -0.4, x1: 1.15, y0: -0.88, y1: 0.88 }


const COLORS = {
  brick: '#8f5340',
  mortar: '#6b3c2e',
  stud: '#C08E5C',
  studEnd: '#D9A876',
  batt: '#C98C86',
  foam: '#EFDCBC',
  lining: '#E7E2D9',
  liningCut: '#CFC8BC',
  heat: '#FF7A2F',
}

// --- Parts -----------------------------------------------------------------

/**
 * Brickwork drawn to a canvas rather than built from geometry.
 *
 * A real stretcher bond needs staggered perpends as well as bed joints, which
 * would be ~70 extra meshes for something that is only ever seen as a surface.
 * One texture gives proper bond, per-brick colour variation and crisp mortar
 * for a single draw call.
 */
function useBrickTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const rows = 11
    const brickH = canvas.height / rows
    const brickW = canvas.width / 4

    ctx.fillStyle = COLORS.mortar
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Deterministic jitter: the same wall should look the same every load.
    let seed = 7
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }

    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 === 0 ? 0 : -brickW / 2
      for (let col = -1; col <= 4; col += 1) {
        const x = col * brickW + offset
        const y = row * brickH
        const shade = 0.88 + rand() * 0.3
        const r = Math.round(0xbe * shade)
        const g = Math.round(0x76 * shade)
        const b = Math.round(0x5b * shade)
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6)
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])
}

/** Outer brick leaf. Textured on the weather face, solid on the cut edges. */
function Brick() {
  const z = BRICK_FRONT - BRICK_DEPTH / 2
  const texture = useBrickTexture()

  // BoxGeometry material order: +x, -x, +y, -y, +z, -z. The weather face is -z.
  const materials = useMemo(() => {
    const cut = new THREE.MeshStandardMaterial({ color: COLORS.brick, roughness: 0.97 })
    const face = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: texture ?? undefined,
      roughness: 0.95,
    })
    return [cut, cut, cut, cut, cut, face]
  }, [texture])

  return (
    <mesh position={[0, 0, z]} material={materials} castShadow receiveShadow>
      <boxGeometry args={[W * 2, H * 2, BRICK_DEPTH]} />
    </mesh>
  )
}

/** Timber frame: studs plus top and bottom plates. */
function Frame() {
  const z = (CAVITY_FRONT + CAVITY_BACK) / 2
  return (
    <group>
      {STUD_X.map((x) => (
        <mesh key={x} position={[x, 0, z]} castShadow receiveShadow>
          <boxGeometry args={[STUD_HW * 2, (H - PLATE_H) * 2, CAVITY_DEPTH]} />
          <meshStandardMaterial color={COLORS.stud} roughness={0.85} />
        </mesh>
      ))}
      {[H - PLATE_H, -H + PLATE_H].map((y) => (
        <mesh key={y} position={[0, y, z]} castShadow receiveShadow>
          <boxGeometry args={[W * 2, PLATE_H * 2, CAVITY_DEPTH]} />
          <meshStandardMaterial color={COLORS.studEnd} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Soft, slightly displaced slab used for both insulation types.
 * Batts get a gentle all-over lumpiness so they read as compressible fibre
 * rather than a plastic block; foam gets a coarser cured face.
 */
function useSoftSlab(w: number, h: number, d: number, amount: number, freq: number) {
  return useMemo(() => {
    const geo = new THREE.BoxGeometry(w, h, d, 18, 24, 2)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const n =
        Math.sin(x * freq) * Math.cos(y * freq * 0.8) * amount +
        Math.sin(x * freq * 2.1 + 1.3) * Math.cos(y * freq * 1.9) * amount * 0.45
      // Push along the face normal-ish: front and back faces only.
      if (Math.abs(z) > d / 2 - 1e-4) pos.setZ(i, z + Math.sign(z) * n)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [w, h, d, amount, freq])
}

function Batt({ bay, index }: { bay: (typeof BAYS)[number]; index: number }) {
  // Undersized and a touch crooked: the gaps around it are the entire point.
  const shrink = 0.09 + (index % 2) * 0.03
  const geo = useSoftSlab(bay.width - shrink, BAY_H - 0.13, CAVITY_DEPTH * 0.68, 0.018, 6)
  const tilt = (index % 2 === 0 ? 1 : -1) * 0.014
  return (
    <mesh
      geometry={geo}
      position={[bay.center + tilt, (index % 2 === 0 ? -1 : 1) * 0.035, (CAVITY_FRONT + CAVITY_BACK) / 2 - 0.02]}
      rotation={[0, 0, tilt]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={COLORS.batt} roughness={1} transparent />
    </mesh>
  )
}

function FoamFill({ bay }: { bay: (typeof BAYS)[number] }) {
  // Oversized so it laps the studs: there is no edge left to leak through.
  const geo = useSoftSlab(bay.width + 0.07, BAY_H + 0.03, CAVITY_DEPTH * 0.94, 0.03, 8)
  return (
    <mesh geometry={geo} position={[bay.center, 0, (CAVITY_FRONT + CAVITY_BACK) / 2]} castShadow receiveShadow>
      <meshStandardMaterial color={COLORS.foam} roughness={0.95} transparent />
    </mesh>
  )
}

/**
 * Internal lining with a rectangular inspection opening.
 *
 * Built as four pieces around the hole rather than one slab, which is what lets
 * the cavity read as something you are looking *into*. The exposed cut edges
 * are darker, like a real plasterboard cut.
 */
function Lining() {
  const pieces = [
    { w: CUT.x0 + W, h: H * 2, x: (-W + CUT.x0) / 2, y: 0 },
    { w: W - CUT.x1, h: H * 2, x: (CUT.x1 + W) / 2, y: 0 },
    { w: CUT.x1 - CUT.x0, h: H - CUT.y1, x: (CUT.x0 + CUT.x1) / 2, y: (CUT.y1 + H) / 2 },
    { w: CUT.x1 - CUT.x0, h: H + CUT.y0, x: (CUT.x0 + CUT.x1) / 2, y: (-H + CUT.y0) / 2 },
  ]
  return (
    <group position={[0, 0, LINING_Z]}>
      {pieces.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0]} castShadow receiveShadow>
          <boxGeometry args={[Math.max(p.w, 0.001), Math.max(p.h, 0.001), LINING_DEPTH]} />
          <meshStandardMaterial color={COLORS.lining} roughness={0.8} />
        </mesh>
      ))}
      {/* Thin darker reveal around the cut, so the hole has a real edge. */}
      <mesh position={[(CUT.x0 + CUT.x1) / 2, (CUT.y0 + CUT.y1) / 2, -LINING_DEPTH / 2 - 0.001]}>
        <planeGeometry args={[CUT.x1 - CUT.x0, CUT.y1 - CUT.y0]} />
        <meshStandardMaterial color={COLORS.liningCut} roughness={1} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

// --- Heat ------------------------------------------------------------------

const PARTICLES = 96

interface Particle {
  x: number
  y: number
  z: number
  speed: number
  scale: number
}

const spawn = (i: number): Particle => {
  const bay = BAYS[i % BAYS.length]
  // Bias toward bay edges, which is exactly where a cut batt leaves a gap.
  const onEdge = Math.random() < 0.55
  const x = onEdge
    ? bay.center + (Math.random() < 0.5 ? -1 : 1) * (bay.width / 2 - 0.015)
    : bay.center + (Math.random() * 2 - 1) * (bay.width / 2)
  return {
    // Clamped into the opening so heat is never drawn over the solid lining.
    x: THREE.MathUtils.clamp(x, CUT.x0 + 0.05, CUT.x1 - 0.05),
    y: THREE.MathUtils.clamp((Math.random() * 2 - 1) * BAY_TOP, CUT.y0 + 0.05, CUT.y1 - 0.05),
    z: CAVITY_BACK + Math.random() * 0.25,
    speed: 0.2 + Math.random() * 0.3,
    scale: 0.5 + Math.random() * 0.7,
  }
}

/**
 * Escaping heat, and only escaping heat.
 *
 * An earlier version also drew "contained" particles for the foam state. Both
 * attempts at that failed: inside the cavity the foam hid them, and on the room
 * side they scattered across the lining and read as confetti stuck to the
 * surface. The stronger contrast turned out to be motion against stillness, so
 * foam simply has no plumes. The warm room light carries "the heat stays here"
 * instead, and the particles fade out as the foam wipes in.
 */
function Heat({ blendRef, frozen }: { blendRef: React.MutableRefObject<number>; frozen: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const particles = useMemo(() => Array.from({ length: PARTICLES }, (_, i) => spawn(i)), [])

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const delta = frozen ? 0 : Math.min(rawDelta, 0.05)
    const leak = 1 - blendRef.current // 1 with batts, 0 with foam
    const escapeZ = 0.85

    for (let i = 0; i < PARTICLES; i += 1) {
      const p = particles[i]

      // Out through the gaps and up. Weighted strongly upward rather than
      // toward the camera, so it reads as plumes rising off the wall and
      // dissipating, not specks hanging in front of the lining.
      p.y += p.speed * 1.15 * delta
      p.z += p.speed * 0.5 * delta
      if (p.y > H + 0.5 || p.z > escapeZ) Object.assign(p, spawn(i))

      const above = THREE.MathUtils.clamp((p.y - CUT.y1) / 0.55, 0, 1)
      const scale = p.scale * (1 - above) * leak

      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.setScalar(Math.max(0.0001, scale))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLES]} frustumCulled={false}>
      <sphereGeometry args={[0.019, 8, 8]} />
      <meshBasicMaterial color={COLORS.heat} transparent opacity={0.95} toneMapped={false} />
    </instancedMesh>
  )
}

// --- Assembly --------------------------------------------------------------

/** Wipe a treatment in or out by scaling and fading it. */
function applyReveal(group: THREE.Group | null, v: number) {
  if (!group) return
  group.visible = v > 0.01
  group.scale.set(1, Math.max(0.0001, v), 1)
  group.traverse((child) => {
    const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
    if (material && 'opacity' in material) material.opacity = Math.min(1, v * 1.5)
  })
}

function Wall({ mode, reducedMotion }: { mode: 'batts' | 'foam'; reducedMotion: boolean }) {
  const battsRef = useRef<THREE.Group>(null)
  const foamRef = useRef<THREE.Group>(null)
  const cavityGlow = useRef<THREE.PointLight>(null)
  const roomGlow = useRef<THREE.PointLight>(null)
  const blend = useRef(mode === 'foam' ? 1 : 0)

  useFrame((_, delta) => {
    const target = mode === 'foam' ? 1 : 0
    blend.current += (target - blend.current) * Math.min(1, delta * 5)
    applyReveal(battsRef.current, 1 - blend.current)
    applyReveal(foamRef.current, blend.current)

    // Heat leaves the cavity and settles into the room as the foam wipes in.
    // Restrained on purpose: turned up, the cavity light blows out the nearest
    // stud into a hot streak.
    if (cavityGlow.current) cavityGlow.current.intensity = 0.9 + (1 - blend.current) * 2.2
    if (roomGlow.current) roomGlow.current.intensity = blend.current * 5.5
  })

  return (
    // Centred on its own bounding box so free orbit spins about the middle of
    // the wall rather than swinging it around an offset pivot.
    <group position={[0, 0, (BRICK_FRONT - BRICK_DEPTH + LINING_Z) / -2]}>
      <Brick />
      <Frame />
      <group ref={battsRef}>
        {BAYS.map((bay, i) => (
          <Batt key={bay.center} bay={bay} index={i} />
        ))}
      </group>
      <group ref={foamRef}>
        {BAYS.map((bay) => (
          <FoamFill key={bay.center} bay={bay} />
        ))}
      </group>
      <Lining />
      <Heat blendRef={blend} frozen={reducedMotion} />
      <pointLight ref={cavityGlow} position={[0.4, 0, CAVITY_BACK + 0.1]} color="#FF7A2F" distance={3.2} />
      {/* Warms the room-side face once the wall is sealed. */}
      <pointLight ref={roomGlow} position={[0.1, 0.1, 1.7]} color="#FFB067" distance={6.5} />
    </group>
  )
}

interface SceneProps {
  mode?: 'batts' | 'foam'
  reducedMotion?: boolean
}

export default function Scene({ mode = 'batts', reducedMotion = false }: SceneProps) {
  // No auto-rotate. The wall holds still until the visitor turns it, so nothing
  // moves under them while they are reading the layer legend beside it.
  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      camera={{ position: [3.0, 1.5, 4.4], fov: 34 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // Decorative: the legend and mode summary beside it carry the meaning.
      aria-hidden="true"
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={['#0A0A0B']} />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[4.0, 5.0, 4.0]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4.0, 2.0, -2.0]} intensity={0.9} color="#9db8ff" />
      <directionalLight position={[0, -3, 2]} intensity={0.35} />

      <Wall mode={mode} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.85}
        minDistance={3.4}
        maxDistance={9}
        // Free all the way around; stopped just short of the poles so the wall
        // never flips through itself.
        minPolarAngle={0.14}
        maxPolarAngle={Math.PI - 0.14}
      />

      <ContactShadows position={[0, -1.5, 0]} opacity={0.45} scale={10} blur={2.8} far={3.5} color="#000000" />
    </Canvas>
  )
}
