import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Seo from '@/components/ui/Seo'
import ProtectedImage from '@/components/ui/ProtectedImage'
import SectionBackdrop from '@/components/ui/SectionBackdrop'
import { PageCta, PageHero, ProseSection } from '@/components/PageParts'
import MidCta from '@/components/MidCta'
import FAQ from '@/components/FAQ'
import { servicePages, serviceOrder, type ServiceId, type ServicePageData } from '@/data/servicePages'
import { galleryProjects } from '@/data/gallery'
import { faqSets } from '@/data/faqs'
import { routes } from '@/data/routes'

/**
 * One residential service: underfloor, roof and ceiling, or walls.
 *
 * The three pages share a shape, so they share this component and differ only
 * in their data. Each opens on a photograph of that job being done, which is
 * what the SEO agency asked for in place of the 3D objects, then the copy,
 * then real jobs of the same kind from the gallery as proof, then the page's
 * own questions.
 */

/**
 * Photographs from real jobs of this kind, residential first. Photos rather
 * than whole jobs, so a job shot before and after (the subfloor is) shows
 * both frames instead of one card holding only the "before".
 */
function JobsLikeThis({ page }: { page: ServicePageData }) {
  const shots = galleryProjects
    .filter((p) => p.area === page.galleryArea)
    .sort((a, b) => Number(b.sector === 'residential') - Number(a.sector === 'residential'))
    .flatMap((job) => job.photos.map((photo) => ({ job, photo })))
    .slice(0, 3)
  if (shots.length === 0) return null

  return (
    <section
      className="relative overflow-hidden border-t border-line/6 bg-ink py-section"
      aria-labelledby="jobs-heading"
    >
      <SectionBackdrop variant="orbs" tone="warm" />
      <div className="relative shell">
        <p className="flex items-center gap-4 text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
          <span className="h-px w-8 bg-accent" aria-hidden="true" />
          From the gallery
        </p>
        <h2 id="jobs-heading" className="mt-6 font-display text-h2 font-semibold leading-tight text-bone">
          Jobs <span className="text-accent">like this</span> one
        </h2>

        <ul className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {shots.map(({ job, photo }) => {
            const facts = photo.caption ?? [job.location, job.foam, job.thickness].filter(Boolean).join(' · ')
            return (
              <li key={photo.file}>
                <article className="card flex h-full flex-col rounded-xl">
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-line/10">
                    <ProtectedImage
                      src={photo.file}
                      alt={photo.alt}
                      width={photo.size?.[0]}
                      height={photo.size?.[1]}
                      frameClassName="size-full"
                      watermark
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-h4 font-semibold leading-tight text-bone">{job.title}</h3>
                    {facts && <p className="mt-3 text-small text-bone-400">{facts}</p>}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>

        <p className="mt-10">
          <Link to={routes.gallery} className="link-wipe inline-flex font-semibold text-accent">
            See every job in the photo gallery
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  )
}

/** The other two services, so a reader who came for one finds the others. */
function OtherServices({ current }: { current: ServiceId }) {
  const others = serviceOrder.filter((id) => id !== current).map((id) => servicePages[id])
  return (
    <section className="relative border-t border-line/6 bg-surface py-16 sm:py-20" aria-labelledby="other-services-heading">
      <div className="relative shell">
        <h2 id="other-services-heading" className="font-display text-h3 font-semibold leading-tight text-bone">
          Other residential services
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((other) => (
            <li key={other.id}>
              <Link
                to={other.path}
                className="card group flex h-full items-center justify-between gap-4 rounded-xl p-6 font-semibold text-bone transition-colors hover:text-accent"
              >
                {other.crumb}
                <ArrowUpRight className="size-4 shrink-0 text-accent" aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            <Link
              to={routes.residential}
              className="card group flex h-full items-center justify-between gap-4 rounded-xl p-6 font-semibold text-bone transition-colors hover:text-accent"
            >
              All residential insulation
              <ArrowUpRight className="size-4 shrink-0 text-accent" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}

export default function ServicePage({ id }: { id: ServiceId }) {
  const page = servicePages[id]
  const [first, second, ...rest] = page.sections

  return (
    <>
      <Seo title={page.seoTitle} description={page.seoDescription} path={page.path} />
      <PageHero page={page} crumb={page.crumb} crumbs={[{ label: 'Residential', href: routes.residential }]} />

      {first && <ProseSection section={first} />}
      {second && <ProseSection section={second} />}
      <MidCta heading="Sound like your house?" />
      {rest.map((section) => (
        <ProseSection key={section.id} section={section} />
      ))}

      <JobsLikeThis page={page} />
      <FAQ set={faqSets[id]} />
      <OtherServices current={id} />
      <PageCta heading={page.cta.heading} text={page.cta.text} />
    </>
  )
}
