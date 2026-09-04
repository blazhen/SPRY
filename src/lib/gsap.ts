import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

/**
 * Single registration point for GSAP plugins.
 *
 * Importing this module anywhere guarantees the plugins are registered exactly
 * once, before any component builds a timeline. Registering inside components
 * risks a race where a ScrollTrigger is created before the plugin exists.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger)

/**
 * Ignore the mobile address bar.
 *
 * On a phone the URL bar collapses and expands as you scroll, which fires a
 * resize and changes `window.innerHeight` by 60 to 100px. ScrollTrigger treats
 * that as a real viewport change and refreshes, recomputing every start, end
 * and pin mid-gesture. The visible result is the pinned hero lurching while
 * you are part way through sealing the house.
 *
 * This tells ScrollTrigger to ignore vertical-only resizes on touch devices,
 * which is exactly the address-bar case and nothing else.
 */
ScrollTrigger.config({ ignoreMobileResize: true })

// Snap transforms to whole pixels where possible, for sharper text on scrubs.
gsap.config({ nullTargetWarn: false })
gsap.defaults({ ease: 'power3.out', duration: 0.9 })

export { gsap, ScrollTrigger, useGSAP }
