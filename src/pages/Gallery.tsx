import { useRef, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import Seo from '@/components/ui/Seo'
import SectionHeading from '@/components/ui/SectionHeading'
import SectionBackdrop from '@/components/ui/SectionBackdrop'
import ProtectedImage from '@/components/ui/ProtectedImage'
import { PageCta } from '@/components/PageParts'
import {
  factSheets,
  factSheetsIntro,
  galleryIntro,
  galleryShots,
  type GalleryShot,
} from '@/data/gallery'

type Filter = 'all' | GalleryShot['sector']

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'residential', label: 'Residential' },
  { id: 'commercial', label: 'Commercial' },
]

/**
 * Photo gallery and technical documents.
 *
 * The site this replaces had a photo gallery, a video gallery and a fact sheets
 * page, all three indexed. Consolidating them here gives those addresses
 * somewhere real to redirect to, and puts the only genuine proof-of-work
 * imagery the business owns back on the site.
 *
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

  const shots = galleryShots.filter((s) => filter === 'all' || s.sector === filter)

  useGSAP(
    () => {
      if (reduced) return
      gsap.from('[data-shot]', {
        y: 26,
        opacity: 0,
        duration: 0.7,
        ease: 'expo.out',
        stagger: 0.045,
        scrollTrigger: { trigger: '[data-grid]', start: 'top 82%' },
      })
    },
    { scope, dependencies: [reduced, filter] },
  )

  return (
    <div ref={scope}>
      <Seo
        title="Photo Gallery & Fact Sheets | Spray It Solutions"
        description="Spray foam insulation jobs photographed on site, plus test reports, safety data sheets and product documentation."
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

          <div className="mt-10 flex flex-wrap gap-2" role="group" aria-label="Filter photographs">
            {FILTERS.map((f) => {
              const active = f.id === filter
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  className={`rounded-pill border px-5 py-2 text-small font-bold transition-colors duration-300 ${
                    active
                      ? 'border-accent bg-accent text-ink'
                      : 'border-line/20 text-bone-400 hover:border-accent hover:text-accent'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          <ul
            data-grid
            className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {shots.map((shot) => (
              <li key={shot.file} data-shot>
                <figure className="overflow-hidden rounded-xl border border-line/10 bg-ink-800">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <ProtectedImage
                      src={shot.file}
                      alt={shot.alt}
                      frameClassName="size-full"
                      watermark
                      loading="lazy"
                    />
                  </div>
                  <figcaption className="border-t border-line/10 p-4 text-small text-bone-400">
                    {shot.caption}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-measure text-small text-bone-400">
            {shots.length} of {galleryShots.length} photographs shown. All are our own jobs.
          </p>
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
