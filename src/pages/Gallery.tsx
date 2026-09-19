import { useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Images,
  Layers,
  MapPin,
  Ruler,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useCarouselWheel } from '@/hooks/useCarouselWheel'
import Seo from '@/components/ui/Seo'
import SectionHeading from '@/components/ui/SectionHeading'
import SectionBackdrop from '@/components/ui/SectionBackdrop'
import ProtectedImage from '@/components/ui/ProtectedImage'
import { PageCta } from '@/components/PageParts'
import {
  factSheets,
  factSheetsIntro,
  galleryIntro,
  galleryProjects,
  type GalleryProject,
} from '@/data/gallery'

type Sector = GalleryProject['sector']
type Filter = 'all' | Sector

const SECTOR_LABEL: Record<Sector, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'residential', label: 'Residential' },
]

/**
 * The questions Glenn answered per job, in the order they read best. A fact
 * renders only when the job has a value for it, so a job he said little about
 * gets a short card rather than a card full of blanks.
 */
type FactKey = 'location' | 'building' | 'foam' | 'thickness' | 'client'
const FACTS: { key: FactKey; label: string; Icon: LucideIcon }[] = [
  { key: 'location', label: 'Location', Icon: MapPin },
  { key: 'building', label: 'Building', Icon: Building2 },
  { key: 'foam', label: 'Foam', Icon: Layers },
  { key: 'thickness', label: 'Thickness', Icon: Ruler },
  { key: 'client', label: 'Client', Icon: UserRound },
]

function Facts({ project, className = '' }: { project: GalleryProject; className?: string }) {
  const facts = FACTS.filter((fact) => project[fact.key])
  if (facts.length === 0) return null

  return (
    <dl className={`grid grid-cols-2 gap-x-6 gap-y-4 ${className}`}>
      {facts.map(({ key, label, Icon }) => {
        const value = project[key] as string
        return (
          /* A long answer takes the full width rather than wrapping into a
             narrow column beside a short one. */
          <div key={key} className={value.length > 28 ? 'col-span-2' : ''}>
            <dt className="flex items-center gap-1.5 text-eyebrow font-bold uppercase tracking-[0.16em] text-bone-400">
              <Icon className="size-3.5 text-accent" strokeWidth={2.2} aria-hidden="true" />
              {label}
            </dt>
            <dd className="mt-1.5 text-small font-semibold leading-snug text-bone">{value}</dd>
          </div>
        )
      })}
    </dl>
  )
}

const ARROW =
  'absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-pill bg-[var(--scrim)] text-white backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-bone disabled:pointer-events-none disabled:opacity-0 sm:size-11'

/**
 * A job's photographs. One photo is a plain frame; two or more become a slider
 * with arrows, dots and a counter, all drawn over the photo so the card below
 * stays the same height whatever it holds.
 *
 * Built on Embla, which is already in the bundle for the video carousel and
 * testimonials: it handles drag, swipe and momentum, and does not fight the
 * page's own scrolling. Trackpads come through useCarouselWheel.
 */
function Photos({
  project,
  priority = false,
}: {
  project: GalleryProject
  /** The first photo of the lead card is above the fold, so it loads eagerly. */
  priority?: boolean
}) {
  const { photos, sector } = project
  const multi = photos.length > 1

  const [viewportRef, api] = useEmblaCarousel({
    active: multi,
    align: 'start',
    duration: 22,
    dragThreshold: 6,
  })
  useCarouselWheel(multi ? api : undefined)

  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!api) return
    const onSelect = () => setIndex(api.selectedScrollSnap())
    onSelect()
    api.on('select', onSelect).on('reInit', onSelect)
    return () => {
      api.off('select', onSelect).off('reInit', onSelect)
    }
  }, [api])

  const current = photos[index] ?? photos[0]

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!multi) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      api?.scrollPrev()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      api?.scrollNext()
    }
  }

  return (
    <div
      className="relative isolate overflow-hidden bg-surface"
      role={multi ? 'group' : undefined}
      aria-roledescription={multi ? 'carousel' : undefined}
      aria-label={multi ? `${project.title} photographs` : undefined}
      onKeyDown={onKeyDown}
    >
      <div ref={viewportRef} className="overflow-hidden">
        <ul className={`flex ${multi ? 'cursor-grab touch-pan-y active:cursor-grabbing' : ''}`}>
          {photos.map((photo, i) => (
            <li
              key={photo.file}
              className="min-w-0 shrink-0 grow-0 basis-full"
              role={multi ? 'group' : undefined}
              aria-roledescription={multi ? 'slide' : undefined}
              aria-label={multi ? `Photo ${i + 1} of ${photos.length}` : undefined}
            >
              <div className="job-card__frame relative aspect-[4/3]">
                <ProtectedImage
                  src={photo.file}
                  alt={photo.alt}
                  frameClassName="size-full transition-transform duration-[1400ms] ease-expo group-hover:scale-[1.035]"
                  watermark
                  loading={priority && i === 0 ? 'eager' : 'lazy'}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* The labels sit over photography of any brightness, so they get a
          scrim, the same dark backing the buttons over the hero use. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[rgb(0_20_70/0.78)] via-[rgb(0_20_70/0.28)] to-transparent"
      />

      <span className="absolute left-4 top-4 rounded-pill bg-[var(--scrim)] px-3 py-1.5 text-eyebrow font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
        {SECTOR_LABEL[sector]}
      </span>

      {multi && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-pill bg-[var(--scrim)] px-3 py-1.5 text-small font-bold tabular-nums text-white backdrop-blur-md">
          <Images className="size-3.5" aria-hidden="true" />
          {index + 1} / {photos.length}
        </span>
      )}

      {/* Caption and dots keep to the left: the photographs carry the old
          site's logo in their bottom-right corner, and anything laid over it
          reads as clutter. */}
      {current?.caption && (
        <p
          className={`pointer-events-none absolute left-4 right-4 text-small font-semibold leading-snug text-white drop-shadow ${
            multi ? 'bottom-9' : 'bottom-4'
          }`}
        >
          {current.caption}
        </p>
      )}

      {multi && (
        <>
          <button
            type="button"
            onClick={() => api?.scrollPrev()}
            disabled={index === 0}
            className={`${ARROW} left-3`}
          >
            <ChevronLeft className="size-5" strokeWidth={2.4} aria-hidden="true" />
            <span className="sr-only">Previous photo</span>
          </button>
          <button
            type="button"
            onClick={() => api?.scrollNext()}
            disabled={index === photos.length - 1}
            className={`${ARROW} right-3`}
          >
            <ChevronRight className="size-5" strokeWidth={2.4} aria-hidden="true" />
            <span className="sr-only">Next photo</span>
          </button>

          {/* Each dot is wrapped in a button with padding, because a 6px dot
              is not a touch target. */}
          <div className="absolute bottom-2.5 left-3 flex items-center">
            {photos.map((photo, i) => (
              <button
                key={photo.file}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className="p-1"
              >
                <span
                  className={`block h-1.5 rounded-pill transition-all duration-300 ${
                    i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/55 hover:bg-white'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="sr-only" aria-live="polite">
            Photo {index + 1} of {photos.length}
            {current?.caption ? `: ${current.caption}` : ''}.
          </p>
        </>
      )}
    </div>
  )
}

/**
 * One job. Stacked in a grid cell; sideways, photo beside details, in a wide
 * slot. Which of the two is decided by the `.job-slot` container query in the
 * stylesheet, from the width the card actually has, so the featured job and a
 * card left alone on the last row both get the wide treatment without either
 * knowing it.
 */
function ProjectCard({ project, lead = false }: { project: GalleryProject; lead?: boolean }) {
  const Title = lead ? 'h2' : 'h3'
  return (
    <article className="job-card card group flex h-full flex-col rounded-xl transition-[border-color,background-color,transform,box-shadow] duration-500 ease-expo hover:-translate-y-1 hover:shadow-lift">
      <div className="job-card__photos">
        <Photos project={project} priority={lead} />
      </div>

      <div className="job-card__body flex flex-1 flex-col p-5 sm:p-6">
        {lead && <span className="eyebrow mb-4">Featured job</span>}
        <Title className="job-card__title font-display text-h4 font-semibold leading-tight text-bone">
          {project.title}
        </Title>

        <Facts project={project} className="job-card__facts mt-4" />

        {project.note && (
          <p className="mt-4 border-t border-line/10 pt-4 text-small text-bone-400">
            {project.note}
          </p>
        )}
      </div>
    </article>
  )
}

/**
 * Photo gallery and technical documents.
 *
 * The site this replaces had a photo gallery, a video gallery and a fact sheets
 * page, all three indexed. Consolidating them here gives those addresses
 * somewhere real to redirect to, and puts the only genuine proof-of-work
 * imagery the business owns back on the site.
 *
 * Photographs are grouped by job, with the details Glenn gave for each one.
 * Every image goes through ProtectedImage, which watermarks it and blocks the
 * casual right-click save. That is not because it stops a determined person, it
 * does not, but because competitors have already been lifting photographs from
 * the existing site and the low-effort route is the one that gets used.
 *
 * There is deliberately no lightbox. A click-to-enlarge would serve a bigger,
 * cleaner copy of exactly the images the client is trying to protect.
 */
export default function Gallery() {
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [filter, setFilter] = useState<Filter>('all')

  const projects = galleryProjects.filter((p) => filter === 'all' || p.sector === filter)
  const [lead, ...rest] = projects
  const photoCount = projects.reduce((n, p) => n + p.photos.length, 0)
  const countFor = (id: Filter) =>
    id === 'all' ? galleryProjects.length : galleryProjects.filter((p) => p.sector === id).length

  useGSAP(
    () => {
      if (reduced) return
      gsap.from('[data-shot]', {
        y: 26,
        opacity: 0,
        duration: 0.7,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: { trigger: '[data-grid]', start: 'top 82%' },
      })
    },
    { scope, dependencies: [reduced, filter] },
  )

  return (
    <div ref={scope}>
      <Seo
        title="Photo Gallery & Fact Sheets | Spray It Solutions"
        description="Spray foam insulation jobs photographed on site, with the building, the foam and the thickness for each, plus test reports, safety data sheets and product documentation."
        path="/gallery"
      />

      {/* ---------------------------------------------------- Photographs */}
      <section
        className="relative overflow-hidden bg-ink pb-section pt-[calc(var(--header-h)+clamp(3rem,8vh,6rem))]"
        aria-labelledby="gallery-heading"
      >
        <SectionBackdrop variant="orbs" tone="both" />

        <div className="relative shell">
          <div className="max-w-3xl">
            <SectionHeading intro={galleryIntro} as="h1" headingId="gallery-heading" headingClassName="text-h1" />
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-line/10 pt-8">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter jobs">
              {FILTERS.map((f) => {
                const active = f.id === filter
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-2 rounded-pill border px-5 py-2.5 text-small font-bold transition-colors duration-300 ${
                      active
                        ? 'border-accent bg-accent text-ink'
                        : 'border-line/20 text-bone-400 hover:border-accent hover:text-accent'
                    }`}
                  >
                    {f.label}
                    <span
                      className={`rounded-pill px-1.5 py-0.5 text-[0.7rem] leading-none tabular-nums ${
                        active ? 'bg-ink/20 text-ink' : 'bg-line/8 text-bone-400'
                      }`}
                    >
                      {countFor(f.id)}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="text-small text-bone-400">
              <span className="font-bold tabular-nums text-bone">{projects.length}</span> jobs,{' '}
              <span className="font-bold tabular-nums text-bone">{photoCount}</span> photographs.
              All our own work.
            </p>
          </div>

          <div data-grid className="mt-8">
            {lead && (
              /* Keyed so a change of filter mounts a fresh slider for the new
                 lead, rather than handing the old slider's position to it. */
              <div key={lead.id} data-shot className="job-slot">
                <ProjectCard project={lead} lead />
              </div>
            )}

            {/* A card left alone on the last row spans it, and turns sideways
                by the container query. Two columns up to xl, three from xl,
                so the rule is written per breakpoint. */}
            {rest.length > 0 && (
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 sm:max-xl:[&>li:nth-child(2n+1):last-child]:col-span-2 xl:grid-cols-3 xl:[&>li:nth-child(3n+1):last-child]:col-span-3">
                {rest.map((project) => (
                  <li key={project.id} data-shot className="job-slot">
                    <ProjectCard project={project} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- Fact sheets */}
      <section
        id="fact-sheets"
        className="relative overflow-hidden border-t border-line/6 bg-surface py-section"
        aria-labelledby="factsheets-heading"
      >
        <SectionBackdrop variant="strata" tone="cool" />

        <div className="relative shell">
          <div className="max-w-3xl">
            <SectionHeading intro={factSheetsIntro} headingId="factsheets-heading" />
          </div>

          <ul className="mt-12 grid gap-4 lg:grid-cols-2">
            {factSheets.map((doc) => (
              <li key={doc.file}>
                <a
                  href={doc.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 rounded-xl border border-line/10 bg-ink-800 p-6 transition-colors duration-300 hover:border-accent/40"
                >
                  <FileText
                    className="mt-0.5 size-5 shrink-0 text-accent"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-eyebrow font-bold uppercase tracking-[0.16em] text-bone-400">
                      {doc.kind}
                    </span>
                    <span className="mt-1.5 block font-display text-h4 font-semibold text-bone">
                      {doc.title}
                    </span>
                    <span className="mt-2 block text-small text-bone-400">{doc.note}</span>
                  </span>
                  <Download
                    className="mt-0.5 size-4 shrink-0 text-bone-400 transition-colors duration-300 group-hover:text-accent"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Opens a PDF in a new tab</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PageCta />
    </div>
  )
}
