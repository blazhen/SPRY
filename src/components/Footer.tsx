import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Youtube,
  type LucideIcon,
} from 'lucide-react'
import { footer } from '@/data/content'
import { site, socialLinks, type SocialLink } from '@/data/site'
import Logo from '@/components/ui/Logo'

const socialIcons: Record<SocialLink['icon'], LucideIcon> = {
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
}

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-line/10 bg-surface pt-section text-bone" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>

      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          {/* ---------------- Brand + contact ---------------- */}
          <div className="lg:col-span-5">
            <Link
              to="/"
              className="inline-block transition-opacity duration-300 ease-expo hover:opacity-80"
              aria-label={`${site.name} home`}
            >
              <Logo height={104} />
            </Link>

            <p className="mt-6 max-w-measure text-body text-bone-400">{footer.blurb}</p>

            <ul className="mt-9 space-y-4 text-body">
              <li className="flex items-start gap-3">
                <MapPin className="mt-1 size-4 shrink-0 text-accent" aria-hidden="true" />
                <address className="not-italic text-bone-400">
                  {site.address.line1}
                  <br />
                  {site.address.suburb} {site.address.state} {site.address.postcode}
                </address>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-accent" aria-hidden="true" />
                <a href={site.phone.tel} className="link-wipe">
                  {site.phone.display}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-accent" aria-hidden="true" />
                <a href={site.emailHref} className="link-wipe break-all">
                  {site.email}
                </a>
              </li>
            </ul>

            {/* ---------------- Socials ---------------- */}
            <ul className="mt-9 flex flex-wrap gap-3">
              {socialLinks.map((social) => {
                const Icon = socialIcons[social.icon]
                return (
                  <li key={social.icon}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="grid size-11 place-items-center rounded-pill border border-line/12 text-bone-400 transition-colors duration-300 hover:border-accent hover:text-accent"
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      <span className="sr-only">
                        {site.shortName} on {social.label}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* ---------------- Sitemap ---------------- */}
          <nav className="lg:col-span-7" aria-label="Footer">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {footer.columns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400">
                    {column.title}
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {column.links.map((link) => (
                      <li key={`${column.title}-${link.label}`}>
                        <Link to={link.href} className="link-wipe text-body text-bone">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Quote nudge */}
            <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-lg border border-line/10 bg-ink-800 p-7">
              <p className="max-w-md font-display text-h4 font-semibold text-bone">
                {site.tagline}
              </p>
              <Link to={site.cta.primary.href} className="btn btn-primary">
                {site.cta.primary.label}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>

        {/* ---------------- Base line ---------------- */}
        <div className="mt-16 flex flex-col gap-4 border-t border-line/10 py-8 text-small text-bone-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>© {year} {site.name}. ABN and licensing details on request.</span>
            <span aria-hidden="true">·</span>
            <Link to="/privacy" className="link-wipe text-bone">
              Privacy policy
            </Link>
          </p>
          <p>
            <a
              href={site.credit.href}
              target="_blank"
              rel="noreferrer noopener"
              className="link-wipe text-bone"
            >
              {site.credit.label}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
