import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export interface RingStage {
  id: string
  figure: string
  title: string
  text: string
}

interface StageRingProps {
  stages: RingStage[]
  label: string
}

/**
 * Degrees per second of idle spin. At 120 degrees between cards this brings a
 * new one to the front roughly every five seconds, which is long enough to read
 * one without the ring feeling stalled.
 */
// Degrees per second. Was 22, which held each card front and centre for
// roughly three seconds: long enough to notice, not long enough to read the
// blurb underneath it before it turned away.
const SPEED = 12
/** Screen pixels to degrees while dragging. */
const DRAG_RATIO = 0.32

/**
 * Three cards on a turntable that turns by itself.
 *
 * The cards sit on a cylinder facing outward, so all three are on screen and
 * the two turned away present their reverse side. It spins continuously, stops
 * while the pointer is over it, and can be thrown left or right by dragging.
 * No arrows, no dots.
 *
 * Rotation is a single number advanced on the GSAP ticker rather than a tween,
 * because idle spin, hover pause and drag momentum all write to the same value
 * and a tween would fight the drag for control of it.
 *
 * The ring is pulled back by its own radius so the front card sits at z = 0.
 * Without that, translateZ toward the camera magnifies the front card by
 * perspective / (perspective - z) and it renders oversized.
 *
 * Under prefers-reduced-motion the turntable is dropped for a plain list: a
 * spinning carousel has no quiet version.
 */
export default function StageRing({ stages, label }: StageRingProps) {
  const scope = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const step = 360 / stages.length

  // Radius from measured width. Too small and the cards overlap, too large and
  // they leave the frame, and the right value moves with the breakpoint.
  useEffect(() => {
    const el = scope.current
    if (!el || reduced) return
    const apply = () =>
      el.style.setProperty('--ring-r', `${Math.round(Math.max(130, el.clientWidth * 0.42))}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [reduced])

  // Spin, hover pause, drag and throw.
  useEffect(() => {
    const ring = ringRef.current
    const stage = scope.current
    if (!ring || !stage || reduced) return

    let angle = 0
    let velocity = 0 // degrees per second, from a throw
    let hovering = false
    let dragging = false
    let lastX = 0
    let lastMoveTime = 0

    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 50) / 1000
      if (dragging) {
        // The pointer owns the angle outright while it is down.
      } else if (Math.abs(velocity) > 1) {
        angle += velocity * dt
        velocity *= 0.94 // settle the throw
      } else if (!hovering) {
        velocity = 0
        angle += SPEED * dt
      }
      gsap.set(ring, { rotationY: angle })
    }
    gsap.ticker.add(tick)

    const onEnter = () => (hovering = true)
    const onLeave = () => (hovering = false)

    const onDown = (event: PointerEvent) => {
      dragging = true
      velocity = 0
      lastX = event.clientX
      lastMoveTime = performance.now()
      stage.setPointerCapture(event.pointerId)
      stage.style.cursor = 'grabbing'
    }
    const onMove = (event: PointerEvent) => {
      if (!dragging) return
      const now = performance.now()
      const dx = event.clientX - lastX
      const dt = Math.max(16, now - lastMoveTime) / 1000
      angle += dx * DRAG_RATIO
      // Remembered so releasing mid-swipe carries the throw through.
      velocity = (dx * DRAG_RATIO) / dt
      lastX = event.clientX
      lastMoveTime = now
    }
    const onUp = (event: PointerEvent) => {
      if (!dragging) return
      dragging = false
      stage.releasePointerCapture(event.pointerId)
      stage.style.cursor = ''
      velocity = gsap.utils.clamp(-900, 900, velocity)
    }

    stage.addEventListener('pointerenter', onEnter)
    stage.addEventListener('pointerleave', onLeave)
    stage.addEventListener('pointerdown', onDown)
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerup', onUp)
    stage.addEventListener('pointercancel', onUp)

    return () => {
      gsap.ticker.remove(tick)
      stage.removeEventListener('pointerenter', onEnter)
      stage.removeEventListener('pointerleave', onLeave)
      stage.removeEventListener('pointerdown', onDown)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerup', onUp)
      stage.removeEventListener('pointercancel', onUp)
    }
  }, [reduced])

  const card = (stage: RingStage) => (
    <div className="flex h-full flex-col rounded-lg border border-line/10 bg-ink-800 p-6">
      <span className="font-display text-h4 font-semibold leading-none text-accent">
        {stage.figure}
      </span>
      <span className="mt-3 font-display text-h4 font-semibold leading-tight text-bone">
        {stage.title}
      </span>
      <span className="mt-2 text-small leading-snug text-bone-400">{stage.text}</span>
    </div>
  )

  if (reduced) {
    return (
      <ol className="grid gap-4 sm:grid-cols-3" aria-label={label}>
        {stages.map((stage) => (
          <li key={stage.id}>{card(stage)}</li>
        ))}
      </ol>
    )
  }

  const longest = stages.reduce((a, b) => (a.text.length >= b.text.length ? a : b))

  return (
    <div
      ref={scope}
      // pan-y keeps vertical scrolling with the page while a horizontal drag
      // turns the ring.
      className="relative cursor-grab touch-pan-y select-none"
      aria-label={label}
    >
      {/* Sizer: the wordiest card at the real card width, so the absolutely
          positioned ring has something to be as tall as. */}
      <div className="pointer-events-none invisible mx-auto w-[64%]" aria-hidden="true">
        {card(longest)}
      </div>

      <div className="absolute inset-0 [perspective:1300px]">
        <div
          className="size-full [transform-style:preserve-3d]"
          style={{ transform: 'translateZ(calc(var(--ring-r, 200px) * -1))' }}
        >
          <div ref={ringRef} className="relative size-full [transform-style:preserve-3d]">
            {stages.map((stage, i) => (
              <div
                key={stage.id}
                className="absolute inset-0 [transform-style:preserve-3d]"
                style={{ transform: `rotateY(${i * step}deg) translateZ(var(--ring-r, 200px))` }}
              >
                {/* Narrower than the track, so the ring reads as a row of
                    cards rather than one slab filling the column. */}
                <div className="mx-auto h-full w-[64%] [transform-style:preserve-3d]">
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    {card(stage)}
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  >
                    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-line/10 bg-ink-800">
                      <span className="font-display text-[3rem] font-semibold leading-none text-line/10">
                        {stage.figure}
                      </span>
                      <span className="mt-2 text-eyebrow font-bold uppercase tracking-[0.2em] text-bone-400">
                        Spray It
                      </span>
                      <span className="mt-3 h-px w-10 bg-accent/60" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
