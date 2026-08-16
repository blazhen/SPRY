import { useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

/**
 * "The Seal": a wall cross-section the camera flies through.
 *
 * The entire scene is driven by one number, `progressRef.current` (0 to 1),
 * which the hero's pinned ScrollTrigger scrubs. Nothing here subscribes to
 * React state during scroll, so a scroll frame costs one useFrame pass and no
 * reconciliation. That is what keeps it at frame rate while pinned.
 *
 * Geometry is all procedural boxes. The only textures are generated on a canvas
 * at mount (a value-noise normal map for the foam, a soft dot for particles),
 * so there is no asset to download, cache-bust or 404.
 *
 * Axes: exterior is -Z, interior is +Z. The camera starts outside in the cold
 * and finishes inside in the warm.
 */

// --- Wall dimensions -------------------------------------------------------
const WALL_W = 4.4
const WALL_H = 3.0

/** Layer extents along Z, outside to inside. */
const L = {
  cladding: { front: -0.62, back: -0.44 },
  batten: { front: -0.44, back: -0.2 },
  foam: { front: -0.2, back: 0.24 },
  plaster: { front: 0.24, back: 0.33 },
}
const span = (l: { front: number; back: number }) => l.back - l.front
const mid = (l: { front: number; back: number }) => (l.front + l.back) / 2

const COLORS = {
  cladding: '#94684E',
  claddingGroove: '#5E4030',
  batten: '#C08E5C',
  foam: '#EBD6B4',
  plaster: '#E7E2D9',
  cold: '#8CC0FF',
  warm: '#FFB067',
  batt: '#C4837C',
}

// --- Camera path -----------------------------------------------------------

interface Waypoint {
  p: number
  pos: [number, number, number]
  look: [number, number, number]
}

/**
 * Hand-placed waypoints rather than a spline through them: a Catmull-Rom curve
 * is smooth but reparameterises by arc length, so beats drift out of sync with
 * the labels. Piecewise interpolation keeps each beat exactly where the copy
 * says it is.
 */
const PATH: Waypoint[] = [
  // Establishing: wide, and aimed low so the wall sits above the headline.
  { p: 0.0, pos: [5.0, 1.7, -7.6], look: [0.1, -0.55, -0.3] },
  // Beat 1 runs to 0.34. The wall is 4.4 x 3.0, so at a 38 degree field of
  // view anything closer than about 4.5 units crops it and the shot stops
  // reading as a wall at all. Held back, and kept off-axis so the layered cut
  // edge stays visible rather than presenting a flat face of cladding.
  { p: 0.32, pos: [3.6, 0.85, -5.0], look: [0.05, -0.15, -0.3] },
  // Beat 2: through the parted cladding, holding just off the foam face.
  // Deliberately NOT inside the foam volume: putting the camera in there
  // renders the box's interior faces at the near plane, which is an
  // out-of-focus beige smear rather than a look at the material. This is a
  // macro of the cured surface instead, where the normal map does its work.
  { p: 0.52, pos: [0.9, 0.25, -1.15], look: [0.15, 0.0, 0.15] },
  // Beat 3: interior side, pulled back far enough to hold the sealed wall and
  // the ghosted batts comparison in the same frame.
  { p: 0.74, pos: [4.6, 1.2, 5.4], look: [-1.2, 0.05, 0.3] },
  // Beat 4: settled back in the warm room.
  { p: 1.0, pos: [3.4, 1.45, 6.8], look: [0.1, 0.05, 0.2] },
]

/** Smootherstep: zero first and second derivative at both ends. */
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/** Linear ramp between two progress marks, clamped. */
const ramp = (p: number, a: number, b: number) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1)

// --- Generated textures ----------------------------------------------------

/**
 * Value-noise normal map, so the foam catches light like a cured, slightly
 * irregular surface instead of reading as a flat plastic slab. Heights are
 * smoothed, then converted to normals by central difference.
 */
function useFoamNormalMap() {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Deterministic noise: the wall should look identical on every load.
    let seed = 1337
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }

    const raw = new Float32Array(size * size)
    for (let i = 0; i < raw.length; i += 1) raw[i] = rand()

    // Cheap smoothing pass to turn white noise into blobby foam cells.
    const height = new Float32Array(size * size)
    const at = (x: number, y: number) => raw[((y + size) % size) * size + ((x + size) % size)]
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let sum = 0
        for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) sum += at(x + dx, y + dy)
        height[y * size + x] = sum / 25
      }
    }

    const image = ctx.createImageData(size, size)
    const h = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
    const strength = 2.6
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (h(x + 1, y) - h(x - 1, y)) * strength
        const dy = (h(x, y + 1) - h(x, y - 1)) * strength
        const n = new THREE.Vector3(-dx, -dy, 1).normalize()
        const i = (y * size + x) * 4
        image.data[i] = (n.x * 0.5 + 0.5) * 255
        image.data[i + 1] = (n.y * 0.5 + 0.5) * 255
        image.data[i + 2] = (n.z * 0.5 + 0.5) * 255
        image.data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(3, 2)
    return texture
  }, [])
}

/** Soft round dot for the particle systems. */
function useDotTexture() {
  return useMemo(() => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }, [])
}

// --- Wall parts ------------------------------------------------------------

/** Exterior cladding, with shadow grooves so it reads as boards. */
function Cladding() {
  const boards = 9
  return (
    <group>
      <mesh position={[0, 0, mid(L.cladding)]} castShadow receiveShadow>
        <boxGeometry args={[WALL_W, WALL_H, span(L.cladding)]} />
        <meshStandardMaterial color={COLORS.cladding} roughness={0.95} transparent />
      </mesh>
      {Array.from({ length: boards - 1 }, (_, i) => (
        <mesh
          key={i}
          position={[0, -WALL_H / 2 + ((i + 1) * WALL_H) / boards, L.cladding.front - 0.005]}
        >
          <boxGeometry args={[WALL_W, 0.026, 0.012]} />
          <meshStandardMaterial color={COLORS.claddingGroove} roughness={1} transparent />
        </mesh>
      ))}
    </group>
  )
}

/** Battens forming the ventilated cavity behind the cladding. */
function Battens() {
  const xs = [-1.65, -0.55, 0.55, 1.65]
  return (
    <group>
      {xs.map((x) => (
        <mesh key={x} position={[x, 0, mid(L.batten)]} castShadow receiveShadow>
          <boxGeometry args={[0.16, WALL_H, span(L.batten)]} />
          <meshStandardMaterial color={COLORS.batten} roughness={0.85} transparent />
        </mesh>
      ))}
    </group>
  )
}

/**
 * The batts comparison, ghosted in beside the sealed wall during beat 3.
 * Undersized pieces with visible gaps, and heat leaking straight out of them.
 */
function GhostBatts({ dot }: { dot: THREE.Texture | null }) {
  const group = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const COUNT = 70
  const W = 2.0
  const H = 2.2

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const speeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * W
      positions[i * 3 + 1] = (Math.random() - 0.5) * H
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4
      speeds[i] = 0.4 + Math.random() * 0.7
    }
    return { positions, speeds }
  }, [])

  useFrame((_, delta) => {
    const pts = pointsRef.current
    if (!pts) return
    const arr = pts.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < COUNT; i += 1) {
      arr[i * 3 + 1] += speeds[i] * delta
      if (arr[i * 3 + 1] > H / 2 + 0.7) {
        arr[i * 3 + 1] = -H / 2
        arr[i * 3] = (Math.random() - 0.5) * W
      }
    }
    pts.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group ref={group} position={[-3.5, 0, 0.1]}>
      {/* Frame and undersized batts, so the gaps are the visible story. */}
      {[-0.62, 0, 0.62].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.46, H - 0.22, 0.34]} />
          <meshStandardMaterial color={COLORS.batt} roughness={1} transparent opacity={0.75} />
        </mesh>
      ))}
      {[-0.93, -0.31, 0.31, 0.93].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.1, H, 0.4]} />
          <meshStandardMaterial color={COLORS.batten} roughness={0.9} transparent opacity={0.8} />
        </mesh>
      ))}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.11}
          map={dot ?? undefined}
          color={COLORS.warm}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  )
}

/**
 * Cold air pushing at the building from outside, stopping dead at the foam.
 * A stream of points travelling +Z that respawn far out the moment they reach
 * the foam face. They never get past it, which is the entire point.
 */
function ColdStream({
  dot,
  materialRef,
}: {
  dot: THREE.Texture | null
  materialRef: MutableRefObject<THREE.PointsMaterial | null>
}) {
  const ref = useRef<THREE.Points>(null)
  const COUNT = 240
  // Deliberately shallow. Spawning further out put particles level with, or
  // behind, the beat-1 camera, where size attenuation blows them into huge
  // white blobs across the frame. This keeps the whole stream in front of the
  // camera and reading as flow toward the wall.
  const START_Z = -3.0

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const speeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * WALL_W * 0.96
      positions[i * 3 + 1] = (Math.random() - 0.5) * WALL_H * 0.96
      positions[i * 3 + 2] = START_Z + Math.random() * (L.foam.front - START_Z)
      speeds[i] = 1.1 + Math.random() * 1.6
    }
    return { positions, speeds }
  }, [])

  useFrame((_, delta) => {
    const pts = ref.current
    if (!pts) return
    const arr = pts.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < COUNT; i += 1) {
      arr[i * 3 + 2] += speeds[i] * delta
      // Deflect sideways as it piles up against the sealed face.
      if (arr[i * 3 + 2] > L.batten.front) arr[i * 3 + 1] += delta * 0.35
      if (arr[i * 3 + 2] >= L.foam.front) {
        arr[i * 3 + 2] = START_Z
        arr[i * 3] = (Math.random() - 0.5) * WALL_W * 0.96
        arr[i * 3 + 1] = (Math.random() - 0.5) * WALL_H * 0.96
      }
    }
    pts.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.075}
        map={dot ?? undefined}
        color={COLORS.cold}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

/** Warm air on the interior side, held in by the seal. */
function WarmRoom({
  dot,
  materialRef,
}: {
  dot: THREE.Texture | null
  materialRef: MutableRefObject<THREE.PointsMaterial | null>
}) {
  const ref = useRef<THREE.Points>(null)
  const COUNT = 150

  const { positions, drift } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const drift = new Float32Array(COUNT * 2)
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * (WALL_W + 0.6)
      positions[i * 3 + 1] = (Math.random() - 0.5) * WALL_H
      positions[i * 3 + 2] = L.plaster.back + 0.15 + Math.random() * 2.4
      drift[i * 2] = (Math.random() - 0.5) * 0.16
      drift[i * 2 + 1] = 0.1 + Math.random() * 0.22
    }
    return { positions, drift }
  }, [])

  useFrame((_, delta) => {
    const pts = ref.current
    if (!pts) return
    const arr = pts.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < COUNT; i += 1) {
      arr[i * 3] += drift[i * 2] * delta
      arr[i * 3 + 1] += drift[i * 2 + 1] * delta
      if (arr[i * 3 + 1] > WALL_H / 2) arr[i * 3 + 1] = -WALL_H / 2
      // The seal is the floor it cannot fall through.
      if (arr[i * 3 + 2] < L.plaster.back + 0.08) arr[i * 3 + 2] = L.plaster.back + 0.08
    }
    pts.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.1}
        map={dot ?? undefined}
        color={COLORS.warm}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

// --- Rig -------------------------------------------------------------------

interface RigProps {
  progressRef: MutableRefObject<number>
  reducedMotion: boolean
}

/**
 * Reads scroll progress once per frame and drives everything from it: camera
 * position and aim, which layers have parted and faded, how hot the foam and
 * the room glow, and which particle system is on.
 */
function Rig({ progressRef, reducedMotion }: RigProps) {
  const { camera } = useThree()
  const root = useRef<THREE.Group>(null)
  const claddingRef = useRef<THREE.Group>(null)
  const battensRef = useRef<THREE.Group>(null)
  const foamRef = useRef<THREE.Mesh>(null)
  const ghostRef = useRef<THREE.Group>(null)
  const coldMatRef = useRef<THREE.PointsMaterial | null>(null)
  const warmMatRef = useRef<THREE.PointsMaterial | null>(null)
  const rimRef = useRef<THREE.PointLight>(null)
  const roomRef = useRef<THREE.PointLight>(null)

  const foamNormal = useFoamNormalMap()
  const dot = useDotTexture()

  const pos = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const wp = useMemo(
    () =>
      PATH.map((w) => ({
        p: w.p,
        pos: new THREE.Vector3(...w.pos),
        look: new THREE.Vector3(...w.look),
      })),
    [],
  )

  const setOpacity = (object: THREE.Object3D | null, value: number) => {
    if (!object) return
    object.visible = value > 0.005
    object.traverse((child) => {
      const m = (child as THREE.Mesh).material as THREE.Material & { opacity?: number }
      if (m && 'opacity' in m) m.opacity = value
    })
  }

  useFrame((state, delta) => {
    const p = THREE.MathUtils.clamp(progressRef.current, 0, 1)

    // --- Camera along the waypoint path ---
    let i = 0
    while (i < wp.length - 2 && p > wp[i + 1].p) i += 1
    const a = wp[i]
    const b = wp[i + 1]
    const t = ease(THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1))
    pos.lerpVectors(a.pos, b.pos, t)
    look.lerpVectors(a.look, b.look, t)
    camera.position.copy(pos)
    camera.lookAt(look)

    // --- Idle rotation before the user starts scrolling ---
    if (root.current) {
      const settle = 1 - ramp(p, 0, 0.12)
      root.current.rotation.y = reducedMotion
        ? 0
        : Math.sin(state.clock.elapsedTime * 0.28) * 0.09 * settle
    }

    // --- Layers part and fade as the camera pushes through ---
    const open = ramp(p, 0.3, 0.52)
    if (claddingRef.current) {
      claddingRef.current.position.x = -open * 3.4
      setOpacity(claddingRef.current, 1 - open)
    }
    if (battensRef.current) {
      battensRef.current.position.x = open * 3.4
      setOpacity(battensRef.current, 1 - open)
    }

    // --- Heat held by the foam ---
    const heat = ramp(p, 0.55, 0.8)
    const foamMat = foamRef.current?.material as THREE.MeshStandardMaterial | undefined
    if (foamMat) foamMat.emissiveIntensity = heat * 0.5
    if (rimRef.current) rimRef.current.intensity = 3 + heat * 5
    // Capped: higher and the plasterboard clips to flat white.
    if (roomRef.current) roomRef.current.intensity = heat * 5.5

    // --- Particle systems, each on only for its own beat ---
    if (coldMatRef.current) {
      coldMatRef.current.opacity = ramp(p, 0.04, 0.14) * (1 - ramp(p, 0.34, 0.46)) * 0.75
    }
    if (warmMatRef.current) warmMatRef.current.opacity = ramp(p, 0.52, 0.72) * 0.9

    // --- Batts comparison, ghosted in for beat 3 only ---
    setOpacity(ghostRef.current, ramp(p, 0.58, 0.7) * (1 - ramp(p, 0.86, 0.95)) * 0.85)

    void delta
  })

  return (
    <>
      <group ref={root}>
        <group ref={claddingRef}>
          <Cladding />
        </group>
        <group ref={battensRef}>
          <Battens />
        </group>

        <mesh ref={foamRef} position={[0, 0, mid(L.foam)]} castShadow receiveShadow>
          <boxGeometry args={[WALL_W, WALL_H, span(L.foam)]} />
          <meshStandardMaterial
            color={COLORS.foam}
            roughness={0.92}
            normalMap={foamNormal ?? undefined}
            normalScale={new THREE.Vector2(0.9, 0.9)}
            emissive={COLORS.warm}
            emissiveIntensity={0}
            transparent
          />
        </mesh>

        <mesh position={[0, 0, mid(L.plaster)]} castShadow receiveShadow>
          <boxGeometry args={[WALL_W, WALL_H, span(L.plaster)]} />
          <meshStandardMaterial color={COLORS.plaster} roughness={0.8} transparent />
        </mesh>

        <group ref={ghostRef}>
          <GhostBatts dot={dot} />
        </group>
      </group>

      <ColdStream dot={dot} materialRef={coldMatRef} />
      <WarmRoom dot={dot} materialRef={warmMatRef} />

      {/* Warm amber rim from the interior side, cool key from outside. */}
      <pointLight ref={rimRef} position={[1.6, 0.8, 1.9]} color="#FF8A3D" distance={14} intensity={3} />
      <pointLight ref={roomRef} position={[0.4, 0.6, 3.4]} color="#FFB067" distance={16} intensity={0} />
    </>
  )
}

// --- Canvas ----------------------------------------------------------------

interface SealSceneProps {
  progressRef: MutableRefObject<number>
  reducedMotion?: boolean
}

export default function SealScene({ progressRef, reducedMotion = false }: SealSceneProps) {
  return (
    <Canvas
      // Capped hard: this scene is mostly large flat surfaces, where a 3x
      // retina render buys nothing and costs a third of the frame budget.
      dpr={[1, 1.6]}
      shadows
      camera={{ position: [3.6, 1.6, -5.0], fov: 38, near: 0.05, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-hidden="true"
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={['#0A0A0B']} />
      {/* Pushed back: closer fog crushed the whole wall into the black
          background and left the scene unreadable. */}
      <fog attach="fog" args={['#0A0A0B', 11, 30]} />

      <ambientLight intensity={0.8} />
      <directionalLight position={[-4, 5, -6]} intensity={2.4} color="#B9D4FF" castShadow />
      <directionalLight position={[4, 3, 5]} intensity={1.7} color="#FFD8B0" />
      <directionalLight position={[0, -4, -2]} intensity={0.5} color="#8FB6FF" />

      <Rig progressRef={progressRef} reducedMotion={reducedMotion} />

      <ContactShadows position={[0, -1.72, 0]} opacity={0.4} scale={16} blur={3} far={5} color="#000000" />
    </Canvas>
  )
}
