import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from './useReducedMotion'

interface MagneticOptions {
  /** How far the element is allowed to travel toward the cursor, in px. */
  strength?: number
  /** Multiplier for how far the inner label lags behind the shell. */
  labelStrength?: number
}

/**
 * Magnetic hover.
 *
 * Returns a ref to attach to a button. While the pointer is inside the element
 * (plus a small padding), the button eases toward the cursor and springs back
 * on leave. Pointer-type is checked so touch devices never get a stuck offset,
 * and the whole effect is skipped under prefers-reduced-motion.
 */
export function useMagnetic<T extends HTMLElement>({
  strength = 0.35,
  labelStrength = 0.55,
}: MagneticOptions = {}) {
  const ref = useRef<T>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const el = ref.current
      if (!el || reduced) return
      // Coarse pointers (touch) have no hover state to speak of.
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

      const label = el.querySelector<HTMLElement>('[data-magnetic-label]')
      const moveShell = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
      const moveShellY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })
      const moveLabel = label ? gsap.quickTo(label, 'x', { duration: 0.7, ease: 'power3.out' }) : null
      const moveLabelY = label ? gsap.quickTo(label, 'y', { duration: 0.7, ease: 'power3.out' }) : null

      const onMove = (event: PointerEvent) => {
        const rect = el.getBoundingClientRect()
        const dx = event.clientX - (rect.left + rect.width / 2)
        const dy = event.clientY - (rect.top + rect.height / 2)
        moveShell(dx * strength)
        moveShellY(dy * strength)
        moveLabel?.(dx * strength * labelStrength)
        moveLabelY?.(dy * strength * labelStrength)
      }

      const onLeave = () => {
        moveShell(0)
        moveShellY(0)
        moveLabel?.(0)
        moveLabelY?.(0)
      }

      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
      // Keyboard users never trigger pointermove; make sure focus resets it.
      el.addEventListener('blur', onLeave)

      return () => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerleave', onLeave)
        el.removeEventListener('blur', onLeave)
      }
    },
    { scope: ref, dependencies: [reduced, strength, labelStrength] },
  )

  return ref
}
