import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Loader2, Flame, ShieldCheck } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { sceneIntro, scene as sceneCopy } from '@/data/content'
import SectionHeading from '@/components/ui/SectionHeading'
import SectionBackdrop from '@/components/ui/SectionBackdrop'

/**
 * Three.js is pulled in as its own chunk and only requested once this section
 * is close to the viewport, so it never competes with the hero for bandwidth
 * and never blocks first paint.
 */
const Scene = lazy(() => import('@/three/Scene'))

type ModeId = (typeof sceneCopy.modes)[number]['id']

function CanvasFallback({ message }: { message: string }) {
  return (
    <div className="grid size-full place-items-center bg-ink-800">
      <div className="flex items-center gap-3 text-small text-bone-400">
        <Loader2 className="size-4 animate-spin text-accent" aria-hidden="true" />
        {message}
      </div>
    </div>
  )
}

export default function InsulationScene() {
  const scope = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  const [mode, setMode] = useState<ModeId>('batts')
  const reduced = useReducedMotion()

  const active = sceneCopy.modes.find((m) => m.id === mode) ?? sceneCopy.modes[0]

  // Gate the dynamic import on proximity rather than on mount.
  useEffect(() => {
    const el = scope.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '150% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={scope}
      className="relative border-t border-line/6 bg-surface py-section"
      aria-labelledby="scene-heading"
    >
      <SectionBackdrop variant="grid" tone="cool" />

      {/* Explicit grid placement rather than two stacked columns. In DOM order
          a phone reads heading, toggle, model, then the verdict and legend that
          describe what it is looking at: the control comes before the thing it
          controls. Desktop places the model back into its own column beside
          the whole stack. */}
      <div className="relative shell grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-x-14 lg:gap-y-0">
        {/* ---------------- Heading ---------------- */}
        <div className="lg:col-span-5 lg:col-start-1 lg:row-start-1">
          <SectionHeading intro={sceneIntro} headingId="scene-heading" />
        </div>

        {/* ---------------- Mode toggle, above the model ---------------- */}
        <fieldset className="lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:mt-9">
          <legend className="sr-only">Choose an insulation type to compare</legend>
          <div className="flex gap-2 rounded-pill border border-line/10 bg-ink-800 p-1.5">
            {sceneCopy.modes.map((m) => {
              const isActive = m.id === mode
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={isActive}
                  className={`flex-1 rounded-pill px-4 py-3 text-small font-bold transition-colors duration-300 ease-expo ${
                    isActive ? 'bg-accent text-ink' : 'text-bone-400 hover:bg-line/6 hover:text-bone'
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* ---------------- Canvas ---------------- */}
        <div className="lg:col-span-7 lg:col-start-6 lg:row-span-3 lg:row-start-1">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-line/10 bg-ink-800 sm:aspect-[4/3]">
            {inView ? (
              <Suspense fallback={<CanvasFallback message={sceneCopy.loading} />}>
                <Scene mode={mode} reducedMotion={reduced} />
              </Suspense>
            ) : (
              <CanvasFallback message={sceneCopy.loading} />
            )}

            {/* Heat key, so the orange particles are never ambiguous. */}
            <p className="pointer-events-none absolute left-5 top-5 inline-flex items-center gap-2 rounded-pill border border-line/12 bg-ink/70 px-3.5 py-2 text-eyebrow font-bold uppercase tracking-[0.16em] text-bone-200 backdrop-blur-md">
              <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
              {active.heatKey}
            </p>
          </div>
        </div>

        {/* ---------------- Verdict and legend ---------------- */}
        <div className="lg:col-span-5 lg:col-start-1 lg:row-start-3 lg:mt-7">
          {/* --- Verdict + explanation for the selected mode --- */}
          <div
            className="rounded-lg border border-line/10 bg-ink-800 p-6"
            // Announce the swap, since the meaning of the canvas just changed.
            aria-live="polite"
          >
            <p
              className={`flex items-center gap-2.5 font-display text-h4 font-semibold ${
                active.leaking ? 'text-accent' : 'text-bone'
              }`}
            >
              {active.leaking ? (
                <Flame className="size-5 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-5 shrink-0 text-accent" aria-hidden="true" />
              )}
              {active.verdict}
            </p>
            <p className="mt-3 text-body text-bone-400">{active.note}</p>
          </div>

          {/* --- Build-up legend. The accessible equivalent of the canvas. --- */}
          <h3 className="mt-9 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400">
            {sceneCopy.legendTitle}
          </h3>
          <dl className="mt-4 divide-y divide-line/10 border-y border-line/10">
            {sceneCopy.layers.map((layer, i) => (
              <div key={layer.id} className="flex items-baseline gap-4 py-3">
                <dt className="flex min-w-[10.5rem] items-baseline gap-4 font-display text-h4 font-semibold text-bone">
                  <span
                    className="font-body text-eyebrow font-bold tabular-nums tracking-[0.18em] text-accent"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {layer.id === 'insulation' ? active.short : layer.name}
                </dt>
                <dd className="text-small text-bone-400">{layer.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
