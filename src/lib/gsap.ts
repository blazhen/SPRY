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

// Snap transforms to whole pixels where possible, for sharper text on scrubs.
gsap.config({ nullTargetWarn: false })
gsap.defaults({ ease: 'power3.out', duration: 0.9 })

export { gsap, ScrollTrigger, useGSAP }
