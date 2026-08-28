import { useState } from 'react'
import { Palette, X } from 'lucide-react'
import { THEMES, THEME_LABELS, useTheme } from '@/hooks/useTheme'

/** Swatches shown on each option, so the choice reads before it is applied. */
const SWATCHES: Record<(typeof THEMES)[number], string[]> = {
  brand: ['#FFFFFF', '#002396', '#8DC63F'],
  ice: ['#0A0A0B', '#FF5A1F', '#38BDF8'],
  amber: ['#0A0A0B', '#FF5A1F', '#FFA04A'],
}

/**
 * Floating palette switcher.
 *
 * A visitor-facing control: people pick the scheme they prefer and it is
 * remembered between visits. Brand is the default, so anyone who never opens
 * this sees the real identity.
 *
 * Collapsed to a single button by default so it never sits on top of the
 * design it is meant to show.
 */
export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 z-[200] print:hidden">
      {open ? (
        <div className="w-72 overflow-hidden rounded-lg border border-line/15 bg-ink-800 shadow-lift">
          <div className="flex items-center justify-between gap-3 border-b border-line/10 px-4 py-3">
            <p className="text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400">
              Colour scheme
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-pill text-bone-400 transition-colors hover:bg-line/8 hover:text-bone"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Close colour scheme picker</span>
            </button>
          </div>

          <fieldset className="p-2">
            <legend className="sr-only">Choose a colour scheme</legend>
            {THEMES.map((id) => {
              const active = id === theme
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors duration-300 ${
                    active ? 'bg-accent/12' : 'hover:bg-line/6'
                  }`}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-pill border border-line/20">
                    {SWATCHES[id].map((hex) => (
                      <span key={hex} className="size-4" style={{ background: hex }} />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-small font-bold ${active ? 'text-accent' : 'text-bone'}`}
                    >
                      {THEME_LABELS[id].name}
                    </span>
                    <span className="block text-eyebrow text-bone-400">
                      {THEME_LABELS[id].note}
                    </span>
                  </span>
                </button>
              )
            })}
          </fieldset>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-pill border border-line/15 bg-ink-800/90 px-4 py-3 text-small font-bold text-bone shadow-lift backdrop-blur-md transition-colors duration-300 hover:border-accent hover:text-accent"
        >
          <Palette className="size-4" aria-hidden="true" />
          {THEME_LABELS[theme].name}
          <span className="sr-only">colour scheme. Open the picker to change it.</span>
        </button>
      )}
    </div>
  )
}
