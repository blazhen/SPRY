import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useLenis } from 'lenis/react'
import { ArrowUpRight, ChevronDown, Menu, Phone, X } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { navItems, site, type NavItem } from '@/data/site'
import MagneticButton from '@/components/ui/MagneticButton'
import Logo from '@/components/ui/Logo'

/** How long the desktop menu stays open after the pointer leaves it. */
const MENU_LINGER_MS = 140

/**
 * Sticky site header.
 *
 * Transparent over the hero, then picks up a blurred background and a hairline
 * once the user scrolls. Hides on scroll-down and returns on scroll-up so the
 * full-bleed sections are never permanently obstructed.
 *
 * The Services entry opens a menu listing each service page with the work
 * grouped under it. The menu is always in the document, hidden with CSS when
 * closed, so every link in it is in the raw HTML for a crawler to follow. It
 * opens on hover and on click, closes on Escape or when focus leaves it, and
 * is an accordion inside the mobile drawer.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const { pathname } = useLocation()
  /* The quote page already is the quote form, so the header CTA there would
     link to the page you are reading. It offers the phone instead. */
  const onQuotePage = pathname === site.cta.primary.href
  const lenis = useLenis()
  const reduced = useReducedMotion()

  const lastScroll = useRef(0)
  const drawerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const servicesRef = useRef<HTMLLIElement>(null)
  const servicesButtonRef = useRef<HTMLButtonElement>(null)
  const linger = useRef<number | null>(null)

  const services = navItems.find((item) => item.groups)
  const onServicesPage = services?.groups?.some((group) => pathname === group.href) ?? false

  // --- Scroll state ------------------------------------------------------
  useLenis(({ scroll }) => {
    const y = Math.max(0, scroll)
    setScrolled(y > 24)
    // Only hide once well past the header's own height, and never while a
    // menu is open.
    const goingDown = y > lastScroll.current
    setHidden(goingDown && y > 220 && !menuOpen && !servicesOpen)
    lastScroll.current = y
  })

  // --- Drawer open/close -------------------------------------------------
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Close on navigation.
  useEffect(() => {
    setMenuOpen(false)
    setServicesOpen(false)
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

  // --- Desktop services menu --------------------------------------------
  const cancelLinger = () => {
    if (linger.current) window.clearTimeout(linger.current)
    linger.current = null
  }
  const openServices = () => {
    cancelLinger()
    setServicesOpen(true)
  }
  const closeServicesSoon = () => {
    cancelLinger()
    linger.current = window.setTimeout(() => setServicesOpen(false), MENU_LINGER_MS)
  }

  useEffect(() => {
    if (!servicesOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setServicesOpen(false)
      servicesButtonRef.current?.focus()
    }
    // A press anywhere outside the entry closes it, which is how a touch or
    // mouse user dismisses it without a keyboard.
    const onPointerDown = (event: PointerEvent) => {
      if (!servicesRef.current?.contains(event.target as Node)) setServicesOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [servicesOpen])

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

  const topLink = (item: NavItem) => (
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
  )

  return (
    <>
      <header
        data-site-header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color,backdrop-filter] duration-500 ease-expo',
          hidden ? '-translate-y-full' : 'translate-y-0',
          scrolled || menuOpen || servicesOpen
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
              {navItems.map((item) =>
                item.groups ? (
                  <li
                    key={item.label}
                    ref={servicesRef}
                    className="relative"
                    onPointerEnter={(event) => {
                      if (event.pointerType === 'mouse') openServices()
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType === 'mouse') closeServicesSoon()
                    }}
                    onBlur={(event) => {
                      // Focus moving anywhere outside the entry closes it.
                      if (!servicesRef.current?.contains(event.relatedTarget as Node | null)) {
                        setServicesOpen(false)
                      }
                    }}
                  >
                    <button
                      ref={servicesButtonRef}
                      type="button"
                      aria-expanded={servicesOpen}
                      aria-controls="services-menu"
                      onClick={(event) => {
                        // A mouse arrives by hovering, which has already
                        // opened the menu, so its click keeps the menu open
                        // rather than snapping it shut. A keyboard press
                        // (detail is 0) toggles.
                        if (event.detail > 0) openServices()
                        else setServicesOpen((open) => !open)
                      }}
                      className={[
                        'relative inline-flex items-center gap-1.5 rounded-pill px-4 py-2 text-small font-medium transition-colors duration-300',
                        onServicesPage || servicesOpen ? 'text-accent' : 'text-bone-400 hover:text-bone',
                      ].join(' ')}
                    >
                      {item.label}
                      <ChevronDown
                        className={`size-3.5 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-4 -bottom-px h-px origin-left bg-accent transition-transform duration-500 ease-expo ${
                          onServicesPage ? 'scale-x-100' : 'scale-x-0'
                        }`}
                      />
                    </button>

                    {/* Always rendered. `invisible` takes it out of the tab
                        order when closed; the links stay in the document. */}
                    <div
                      id="services-menu"
                      className={`absolute left-1/2 top-full w-[min(56rem,calc(100vw-2*var(--gutter)))] -translate-x-1/2 pt-3 transition-[opacity,visibility,transform] duration-300 ease-expo ${
                        servicesOpen
                          ? 'visible translate-y-0 opacity-100'
                          : 'invisible -translate-y-1 opacity-0'
                      }`}
                    >
                      <div className="grid gap-1.5 rounded-xl border border-line/12 bg-ink p-2 shadow-lift md:grid-cols-3">
                        {item.groups.map((group) => (
                          <div
                            key={group.href}
                            className="rounded-lg p-5 transition-colors duration-300 hover:bg-surface"
                          >
                            <Link
                              to={group.href}
                              className="group/g inline-flex items-center gap-1.5 font-display text-h4 font-semibold leading-tight text-bone transition-colors duration-300 hover:text-accent"
                            >
                              {group.label}
                              <ArrowUpRight
                                className="size-4 transition-transform duration-300 group-hover/g:-translate-y-0.5 group-hover/g:translate-x-0.5"
                                aria-hidden="true"
                              />
                            </Link>
                            <p className="mt-2 text-small leading-snug text-bone-400">{group.blurb}</p>
                            {group.children && (
                              <ul className="mt-4 space-y-1 border-t border-line/10 pt-4">
                                {group.children.map((child) => (
                                  <li key={child.href}>
                                    <Link
                                      to={child.href}
                                      className="link-wipe text-small font-semibold text-bone-400 hover:text-accent"
                                    >
                                      {child.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={item.href}>{topLink(item)}</li>
                ),
              )}
            </ul>
          </nav>

          {/* --- Actions --- */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={site.phone.tel}
              className="hidden min-h-11 items-center gap-2 rounded-pill border border-line/12 px-4 py-2.5 text-small font-semibold text-bone transition-colors duration-300 hover:border-accent hover:text-accent md:inline-flex"
            >
              <Phone className="size-4" aria-hidden="true" />
              {site.phone.display}
            </a>

            <MagneticButton
              href={onQuotePage ? site.phone.tel : site.cta.primary.href}
              variant="primary"
              className="hidden !px-5 !py-3 text-small sm:inline-flex"
              strength={0.22}
            >
              {onQuotePage ? site.cta.secondary.label : site.cta.primary.label}
            </MagneticButton>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line/15 px-4 py-2.5 text-small font-semibold text-bone transition-colors duration-300 hover:border-accent hover:text-accent lg:hidden"
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
                  <li key={item.label} className="border-b border-line/8 last:border-b-0">
                    {item.groups ? (
                      <DrawerServices item={item} openByDefault={onServicesPage} />
                    ) : (
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
                    )}
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
                {site.cta.secondary.label}
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

/**
 * The Services entry inside the drawer: an accordion row that opens to list
 * each service page with its sub-service links beneath it.
 */
function DrawerServices({ item, openByDefault }: { item: NavItem; openByDefault: boolean }) {
  const [open, setOpen] = useState(openByDefault)
  const panelId = 'drawer-services'

  return (
    <>
      <div className="line-mask">
        <button
          type="button"
          data-drawer-line
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={`flex w-full items-baseline gap-4 py-4 text-left font-display text-[clamp(2rem,9vw,3rem)] font-semibold leading-none tracking-tight transition-colors duration-300 ${
            open ? 'text-accent' : 'text-bone hover:text-accent'
          }`}
        >
          <span className="font-body text-eyebrow font-bold tracking-[0.18em] text-bone-400">
            {item.index}
          </span>
          <span className="flex flex-1 items-center justify-between gap-4">
            {item.label}
            <ChevronDown
              className={`size-6 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </span>
        </button>
      </div>

      <div id={panelId} hidden={!open} className="pb-5 pl-[2.6rem]">
        <ul className="space-y-5">
          {item.groups?.map((group) => (
            <li key={group.href}>
              <Link
                to={group.href}
                className="font-display text-h4 font-semibold text-bone transition-colors duration-300 hover:text-accent"
              >
                {group.label}
              </Link>
              {group.children && (
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {group.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        to={child.href}
                        className="link-wipe text-small font-semibold text-bone-400 hover:text-accent"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
