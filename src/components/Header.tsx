import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useLenis } from 'lenis/react'
import { Menu, Phone, X, ArrowUpRight } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { navItems, site } from '@/data/site'
import MagneticButton from '@/components/ui/MagneticButton'
import Logo from '@/components/ui/Logo'

/**
 * Sticky site header.
 *
 * Transparent over the hero, then picks up a blurred background and a hairline
 * once the user scrolls. Hides on scroll-down and returns on scroll-up so the
 * full-bleed sections are never permanently obstructed.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const lenis = useLenis()
  const reduced = useReducedMotion()

  const lastScroll = useRef(0)
  const drawerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // --- Scroll state ------------------------------------------------------
  useLenis(({ scroll }) => {
    const y = Math.max(0, scroll)
    setScrolled(y > 24)
    // Only hide once well past the header's own height, and never while the
    // drawer is open.
    const goingDown = y > lastScroll.current
    setHidden(goingDown && y > 220 && !menuOpen)
    lastScroll.current = y
  })

  // --- Drawer open/close -------------------------------------------------
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Close on navigation.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Lock page scroll while the drawer is open.
  useEffect(() => {
    if (!lenis) return
    if (menuOpen) lenis.stop()
    else lenis.start()
    return () => lenis.start()
  }, [menuOpen, lenis])

  // Escape to close, and a focus trap so Tab cannot escape the drawer.
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
        toggleRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (!focusables || focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    // Move focus into the drawer once it exists.
    const id = window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>('a[href]')?.focus()
    }, 60)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(id)
    }
  }, [menuOpen, closeMenu])

  // Drawer entrance: numbered rows stagger up behind a mask.
  useGSAP(
    () => {
      if (!menuOpen || reduced) return
      gsap
        .timeline()
        .from('[data-drawer-panel]', { yPercent: -100, duration: 0.7, ease: 'power4.inOut' })
        .from(
          '[data-drawer-line]',
          { yPercent: 110, duration: 0.75, stagger: 0.055, ease: 'power4.out' },
          '-=0.32',
        )
        .from('[data-drawer-foot]', { autoAlpha: 0, y: 16, duration: 0.5 }, '-=0.4')
    },
    { dependencies: [menuOpen, reduced], scope: drawerRef },
  )

  return (
    <>
      <header
        data-site-header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color,backdrop-filter] duration-500 ease-expo',
          hidden ? '-translate-y-full' : 'translate-y-0',
          scrolled || menuOpen
            ? 'border-b border-line/10 bg-ink/70 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        ].join(' ')}
      >
        <div className="shell flex h-[var(--header-h,4.75rem)] items-center justify-between gap-6">
          {/* --- Logo --- */}
          <Link
            to="/"
            className="shrink-0 transition-opacity duration-300 ease-expo hover:opacity-80"
            aria-label={`${site.name} home`}
          >
            <Logo height={84} className="h-[4.5rem] sm:h-[5.25rem]" />
          </Link>

          {/* --- Desktop nav --- */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                      [
                        'relative rounded-pill px-4 py-2 text-small font-medium transition-colors duration-300',
                        isActive ? 'text-accent' : 'text-bone-400 hover:text-bone',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {item.label}
                        <span
                          aria-hidden="true"
                          className={`absolute inset-x-4 -bottom-px h-px origin-left bg-accent transition-transform duration-500 ease-expo ${
                            isActive ? 'scale-x-100' : 'scale-x-0'
                          }`}
                        />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* --- Actions --- */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={site.phone.tel}
              className="hidden items-center gap-2 rounded-pill border border-line/12 px-4 py-2.5 text-small font-semibold text-bone transition-colors duration-300 hover:border-accent hover:text-accent md:inline-flex"
            >
              <Phone className="size-4" aria-hidden="true" />
              {site.phone.display}
            </a>

            <MagneticButton
              href={site.cta.primary.href}
              variant="primary"
              className="hidden !px-5 !py-3 text-small sm:inline-flex"
              strength={0.22}
            >
              Get a Free Quote
            </MagneticButton>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              className="inline-flex items-center gap-2 rounded-pill border border-line/15 px-4 py-2.5 text-small font-semibold text-bone transition-colors duration-300 hover:border-accent hover:text-accent lg:hidden"
            >
              {menuOpen ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                <Menu className="size-4" aria-hidden="true" />
              )}
              <span>{menuOpen ? 'Close' : 'Menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- Mobile drawer --- */}
      {menuOpen && (
        <div
          ref={drawerRef}
          id="mobile-nav-drawer"
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <button
            type="button"
            className="absolute inset-0 size-full cursor-default bg-ink/60 backdrop-blur-sm"
            onClick={closeMenu}
            tabIndex={-1}
            aria-hidden="true"
          />

          <div
            data-drawer-panel
            className="relative flex max-h-full flex-col overflow-y-auto border-b border-line/10 bg-ink px-gutter pb-10 pt-[calc(var(--header-h,4.75rem)+2rem)]"
          >
            <nav aria-label="Mobile">
              <ul>
                {navItems.map((item) => (
                  <li key={item.href} className="border-b border-line/8 last:border-b-0">
                    <div className="line-mask">
                      <NavLink
                        to={item.href}
                        end={item.href === '/'}
                        data-drawer-line
                        className={({ isActive }) =>
                          [
                            'flex items-baseline gap-4 py-4 font-display text-[clamp(2rem,9vw,3rem)] font-semibold leading-none tracking-tight transition-colors duration-300',
                            isActive ? 'text-accent' : 'text-bone hover:text-accent',
                          ].join(' ')
                        }
                      >
                        <span className="font-body text-eyebrow font-bold tracking-[0.18em] text-bone-400">
                          {item.index}
                        </span>
                        {item.label}
                      </NavLink>
                    </div>
                  </li>
                ))}
              </ul>
            </nav>

            <div data-drawer-foot className="mt-9 flex flex-col gap-3">
              <MagneticButton href={site.cta.primary.href} variant="primary" strength={0}>
                {site.cta.primary.label}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </MagneticButton>
              <a href={site.phone.tel} className="btn btn-ghost">
                <Phone className="size-4" aria-hidden="true" />
                {site.phone.display}
              </a>
              <p className="mt-3 text-small text-bone-400">
                {site.address.full}
                <br />
                <a href={site.emailHref} className="link-wipe text-bone">
                  {site.email}
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
