import { site } from '@/data/site'

/**
 * Shown only if something throws that no smaller boundary caught. Plain HTML
 * and an ordinary link, so it cannot fail for the same reason the page did.
 */
export default function PageCrashed() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-h2 font-semibold text-bone">Something went wrong on our side.</h1>
        <p className="mt-4 text-body text-bone-400">
          Please reload the page. If it keeps happening, call us on{' '}
          <a href={site.phone.tel} className="font-bold text-bone underline">
            {site.phone.display}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primary mt-8"
        >
          Reload the page
        </button>
      </div>
    </main>
  )
}
