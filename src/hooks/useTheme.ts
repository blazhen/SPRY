import { useCallback, useEffect, useState } from 'react'

export const THEMES = ['dark', 'brand'] as const
export type Theme = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = 'sprayit:theme'

export const THEME_LABELS: Record<Theme, { name: string; note: string }> = {
  dark: { name: 'Midnight', note: 'Ink and amber' },
  brand: { name: 'Brand', note: 'White, navy and green' },
}

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'dark' || value === 'brand' ? value : null
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
    if (typeof document === 'undefined') return 'dark'
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'brand') return 'brand'
    return readStored() ?? 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    // `dark` is the default palette defined on :root, so it carries no
    // attribute at all rather than an attribute that overrides nothing.
    if (theme === 'brand') root.setAttribute('data-theme', 'brand')
    else root.removeAttribute('data-theme')

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
