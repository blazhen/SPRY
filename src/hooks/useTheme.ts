import { useCallback, useEffect, useState } from 'react'

export const THEMES = ['brand', 'ice', 'amber'] as const
export type Theme = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = 'sprayit:theme'

export const THEME_LABELS: Record<Theme, { name: string; note: string }> = {
  brand: { name: 'Brand', note: 'White, navy and green' },
  ice: { name: 'Ice', note: 'Dark. Amber for heat, ice for cooling' },
  amber: { name: 'Amber', note: 'Dark. Warm throughout' },
}

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return (THEMES as readonly string[]).includes(String(value)) ? (value as Theme) : null
  } catch {
    // Private browsing can throw on localStorage. Fall back to the default.
    return null
  }
}

/**
 * Which palette is applied, as `data-theme` on the document element.
 *
 * The attribute is the single source of truth and is set by an inline script in
 * index.html before first paint, so the page never flashes the wrong palette.
 * This hook reads that attribute rather than re-deciding, then writes to it.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'brand'
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr && (THEMES as readonly string[]).includes(attr)) return attr as Theme
    return readStored() ?? 'brand'
  })

  useEffect(() => {
    const root = document.documentElement
    // 'brand' is the default palette defined on :root, so it carries no
    // attribute at all rather than an attribute that overrides nothing.
    if (theme === 'brand') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)

    // Keep the browser UI (address bar, status bar) with the page.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'brand' ? '#FFFFFF' : '#0A0A0B')

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* not fatal */
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])

  return { theme, setTheme }
}
