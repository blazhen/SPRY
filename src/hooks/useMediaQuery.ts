import { useEffect, useState } from 'react'

/**
 * Subscribe to a media query.
 *
 * Returns false during the very first render so server-side and pre-hydration
 * output is deterministic, then settles on the real value in an effect.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(mql.matches)

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [query])

  return matches
}

/**
 * True on phones and small tablets, where a pinned WebGL fly-through would
 * cost more frame budget than it earns.
 */
export const useIsCompact = () => useMediaQuery('(max-width: 1023px)')
