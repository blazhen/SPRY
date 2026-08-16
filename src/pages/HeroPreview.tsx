import { Suspense, lazy, type ComponentType } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Boxes, Check } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { heroVariants, type HeroVariant } from '@/data/heroes'
import { ACTIVE_HERO } from '@/config'

import HeroHouse from '@/components/HeroHouse'
import HeroSpray from '@/components/HeroSpray'
import HeroFoam from '@/components/HeroFoam'
import HeroEditorial from '@/components/HeroEditorial'
import HeroComfort from '@/components/HeroComfort'
import Hero from '@/components/Hero'

// The Seal pulls in Three.js, so it stays behind a split point even here.
const HeroSeal = lazy(() => import('@/components/HeroSeal'))

// ComponentType, not `() => JSX.Element`: the lazy-wrapped Seal is a
// LazyExoticComponent and does not match a plain zero-argument function type.
const COMPONENTS: Record<HeroVariant['id'], ComponentType> = {
  house: HeroHouse,
  spray: HeroSpray,
  foam: HeroFoam,
  editorial: HeroEditorial,
  comfort: HeroComfort,
  thermal: Hero,
  seal: HeroSeal,
}

/** Fixed bar for hopping between variants without going back to the index. */
function Switcher({ current }: { current: HeroVariant['id'] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex justify-center px-gutter pb-5">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-pill border border-white/12 bg-ink/85 p-1.5 backdrop-blur-xl no-scrollbar">
        <Link
          to="/heroes"
          className="grid size-9 shrink-0 place-items-center rounded-pill text-bone-400 transition-colors hover:bg-white/8 hover:text-bone"
          aria-label="Back to all heroes"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>

        {heroVariants.map((variant) => {
          const active = variant.id === current
          return (
            <Link
              key={variant.id}
              to={`/heroes/${variant.id}`}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-pill px-4 py-2 text-small font-bold transition-colors duration-300 ${
                active ? 'bg-accent text-ink' : 'text-bone-400 hover:bg-white/8 hover:text-bone'
              }`}
            >
              {variant.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Renders one hero on its own so the variants can be judged side by side.
 *
 * Wrapped in the normal site chrome, because every hero is designed to sit
 * under the sticky header and a preview without it would flatter them all
 * unfairly. Marked noindex: these are internal comparison pages.
 */
export function HeroPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const variant = heroVariants.find((v) => v.id === id)

  if (!variant) return <Navigate to="/heroes" replace />
  const Component = COMPONENTS[variant.id]

  return (
    <>
      <Helmet>
        <title>{`Hero preview: ${variant.name} | Spray It Solutions`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Suspense
        fallback={<div className="grid min-h-[100svh] place-items-center bg-ink text-bone-400">Loading…</div>}
      >
        <Component />
      </Suspense>

      {/* Context strip, so the thing being looked at is named. */}
      <section className="bg-ink py-section">
        <div className="shell max-w-3xl">
          <span className="eyebrow">Hero preview</span>
          <h2 className="mt-5 text-h2 font-semibold text-bone">{variant.name}</h2>
          <p className="mt-5 text-lead text-bone-400">{variant.idea}</p>
          <dl className="mt-8 divide-y divide-white/10 border-y border-white/10">
            <div className="flex flex-wrap gap-x-6 gap-y-1 py-4">
              <dt className="min-w-[7rem] text-small font-bold uppercase tracking-[0.14em] text-accent">
                Angle
              </dt>
              <dd className="flex-1 text-body text-bone-200">{variant.angle}</dd>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 py-4">
              <dt className="min-w-[7rem] text-small font-bold uppercase tracking-[0.14em] text-accent">
                Trade-off
              </dt>
              <dd className="flex-1 text-body text-bone-200">{variant.note}</dd>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 py-4">
              <dt className="min-w-[7rem] text-small font-bold uppercase tracking-[0.14em] text-accent">
                To ship it
              </dt>
              <dd className="flex-1 text-body text-bone-200">
                Set <code className="text-accent">ACTIVE_HERO = &apos;{variant.id}&apos;</code> in{' '}
                <code className="text-bone">src/config.ts</code>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <Switcher current={variant.id} />
    </>
  )
}

/** Index of every hero variant. */
export function HeroesIndexPage() {
  return (
    <>
      <Helmet>
        <title>Hero variants | Spray It Solutions</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <section className="min-h-[100svh] bg-ink pb-section pt-[calc(var(--header-h)+5rem)]">
        <div className="shell">
          <span className="eyebrow">Internal</span>
          <h1 className="mt-6 max-w-[18ch] text-h1 font-semibold text-bone">
            Seven heroes, one page each.
          </h1>
          <p className="mt-6 max-w-measure text-lead text-bone-400">
            Every hero built for this project, live and interactive. Open them one at a
            time, then set the winner in <code className="text-accent">src/config.ts</code>.
          </p>

          <ul className="mt-14 grid gap-5 lg:grid-cols-2">
            {heroVariants.map((variant, i) => (
              <li key={variant.id}>
                <Link
                  to={`/heroes/${variant.id}`}
                  className="group card flex h-full flex-col p-8 lg:p-9"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-display text-h3 font-semibold leading-none text-bone/40">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex flex-wrap justify-end gap-2">
                      {variant.id === ACTIVE_HERO && (
                        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-3 py-1 text-eyebrow font-bold uppercase tracking-[0.14em] text-ink">
                          <Check className="size-3" aria-hidden="true" />
                          Live
                        </span>
                      )}
                      {variant.usesWebGL && (
                        <span className="inline-flex items-center gap-1.5 rounded-pill border border-white/15 px-3 py-1 text-eyebrow font-bold uppercase tracking-[0.14em] text-bone-400">
                          <Boxes className="size-3" aria-hidden="true" />
                          WebGL
                        </span>
                      )}
                    </span>
                  </div>

                  <h2 className="mt-6 text-h3 font-semibold text-bone transition-colors duration-300 group-hover:text-accent">
                    {variant.name}
                  </h2>
                  <p className="mt-4 text-body text-bone-400">{variant.idea}</p>
                  <p className="mt-4 text-small text-bone-400/80">{variant.note}</p>

                  <span className="link-wipe mt-8 inline-flex self-start text-accent">
                    View this hero
                    <ArrowUpRight
                      className="size-4 transition-transform duration-500 ease-expo group-hover:translate-x-1 group-hover:-translate-y-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
