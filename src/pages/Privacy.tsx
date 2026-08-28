import Seo from '@/components/ui/Seo'
import { policySections, privacyMeta } from '@/data/legal'
import { site } from '@/data/site'

/**
 * Privacy policy.
 *
 * Referenced from the quote form's consent block and from the footer, and
 * required before Google or Meta will run advertising. Content lives in
 * `src/data/legal.ts` so it can be edited without touching layout.
 */
export default function Privacy() {
  return (
    <>
      <Seo title={privacyMeta.title} description={privacyMeta.description} path="/privacy" />

      <section className="bg-ink pb-section pt-[calc(var(--header-h)+clamp(3rem,8vh,6rem))]">
        <div className="shell max-w-4xl">
          <p className="text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">Legal</p>
          <h1 className="mt-5 font-display text-h1 font-semibold text-bone">Privacy policy</h1>
          <p className="mt-5 text-small text-bone-400">
            Last updated {privacyMeta.lastUpdated}
          </p>

          <div className="mt-14 space-y-12 border-t border-line/10 pt-12">
            {policySections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-h3 font-semibold text-bone">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-5 max-w-measure text-body text-bone-400">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-5 max-w-measure space-y-3">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-body text-bone-400">
                        <span
                          className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section>
              <h2 className="font-display text-h3 font-semibold text-bone">Contact us</h2>
              <p className="mt-5 max-w-measure text-body text-bone-400">
                For any privacy question, or to access, correct or delete your information:
              </p>
              <ul className="mt-5 space-y-2 text-body">
                <li>
                  <a href={site.emailHref} className="link-wipe break-all text-bone">
                    {site.email}
                  </a>
                </li>
                <li>
                  <a href={site.phone.tel} className="link-wipe text-bone">
                    {site.phone.display}
                  </a>
                </li>
                <li className="text-bone-400">{site.address.full}</li>
              </ul>
            </section>
          </div>
        </div>
      </section>
    </>
  )
}
