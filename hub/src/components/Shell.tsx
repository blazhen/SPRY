import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { openTakePhotos } from './photos/TakePhotosDialog'
import { Briefcase, Camera, CalendarDays, FileText, ListChecks, Loader2, MoreHorizontal, Receipt, RefreshCw, Users, X } from 'lucide-react'
import { DATA_SOURCE } from '../config'
import { jobText } from '../lib/format'
import { useMenu } from '../lib/jobLayout'
import { menuDef, type MenuConfig, type MenuId } from '../lib/menuConfig'
import type { Route } from '../lib/router'
import { retryLive, startLive, useLive } from '../lib/live'
import { stageWarnings, todoQueue, useStore } from '../lib/store'
import { startSync, useSync } from '../lib/sync'
import { clearWriteError, useWriteError } from '../lib/writeError'
import { recordFromHash } from '../lib/recent'
import { GlobalSearch } from './GlobalSearch'
import { SyncStatus } from './SyncStatus'
import { ConfirmHost, Notice } from './ui'

type TabId = MenuId

/** Which menu item a route belongs to. */
function tabFor(route: Route): TabId | null {
  switch (route.name) {
    case 'todo': return 'todo'
    case 'jobs':
    case 'job': return 'jobs'
    case 'quotes':
    case 'edit': return 'quotes'
    case 'invoices':
    case 'invoice':
    case 'invoiceNew':
    case 'invoiceEdit': return 'invoices'
    case 'contacts':
    case 'contact': return 'contacts'
    case 'week': return 'week'
    case 'calendar': return 'calendar'
    case 'templates': return 'templates'
    case 'terms': return 'terms'
    case 'prices': return 'prices'
    case 'settings': return 'settings'
    case 'foam': return 'foam'
    default: return null
  }
}

/** The phone bottom bar keeps these five tabs at a readable size. Everything else visible in the menu is in its More. */
const BOTTOM_TABS: TabId[] = ['todo', 'jobs', 'quotes', 'invoices', 'contacts']

/** The More menu: a button that opens a short list. Escape and outside clicks close it. */
function MoreMenu({ current, placement, variant, menu: cfg }: { current: TabId | null; placement: 'below' | 'above'; variant: 'top' | 'bottom'; menu: MenuConfig }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const id = useId()
  // Top bar: the items Edit layout put inside More. Phone: This week first, then every visible item the bottom bar lacks.
  const menu =
    variant === 'bottom'
      ? [...cfg.top, ...cfg.more].filter((m) => !BOTTOM_TABS.includes(m)).sort((a, b) => (a === 'week' ? -1 : b === 'week' ? 1 : 0)).map(menuDef)
      : cfg.more.map(menuDef)
  const inMore = menu.some((m) => m.id === current)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Close after the route changes.
  useEffect(() => {
    setOpen(false)
  }, [current])

  if (menu.length === 0) return null

  return (
    <div ref={wrap} className={variant === 'bottom' ? 'relative flex flex-1 basis-0' : 'relative'}>
      <button
        ref={btn}
        type="button"
        className={variant === 'bottom' ? 'bottom-item w-full' : 'nav-link'}
        aria-expanded={open}
        aria-controls={id}
        aria-current={inMore ? 'page' : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal size={variant === 'bottom' ? 26 : 22} aria-hidden="true" className={variant === 'top' ? 'mr-2' : ''} />
        More
      </button>
      {open && (
        <div
          id={id}
          className={`menu-pop absolute z-40 w-72 max-w-[calc(100vw-1.5rem)] ${placement === 'above' ? 'bottom-full mb-3 right-0' : 'top-full mt-2 right-0'}`}
        >
          <ul className="m-0 list-none p-0">
            {menu.map((m) => (
              <li key={m.id}>
                <a href={m.to} className="menu-item" aria-current={current === m.id ? 'page' : undefined}>
                  {m.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const s = useStore()
  const current = tabFor(route)
  const menu = useMenu()
  // The job page is a fixed frame (window height, three panels that scroll on their own). Other pages scroll as before.
  const framed = route.name === 'job' || route.name === 'contact'
  const waiting = todoQueue(undefined, s).length
  // Live mode: start the shared-data sync once the gate has let us in, and wait for the first load.
  const { ready, status } = useSync()
  const live = useLive()
  const writeError = useWriteError()
  useEffect(() => {
    startSync()
    // Live mode only: stage names, owners and the job list come from the CRM. Mock mode makes no /api call.
    startLive()
  }, [])
  const warnings = stageWarnings()

  // Remember the jobs, contacts and quotes he opens, whichever page opens them.
  useEffect(() => {
    const on = () => recordFromHash(window.location.hash)
    on()
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const ICONS: Partial<Record<TabId, typeof Briefcase>> = { todo: ListChecks, jobs: Briefcase, quotes: FileText, invoices: Receipt, contacts: Users, week: CalendarDays }
  const bottomItems = BOTTOM_TABS.map((id) => ({ ...menuDef(id), Icon: ICONS[id] as typeof Briefcase, count: id === 'todo' ? waiting : undefined }))
  const topItems = menu.top.map((id) => ({ ...menuDef(id), count: id === 'todo' ? waiting : undefined }))

  return (
    <div style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <a href="#main" className="skip no-print" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Skip to content
      </a>
      <div>
        <div className={framed ? 'min-w-0 app-frame' : 'min-w-0'} data-frame={framed ? 'job' : undefined}>
          <header className="topbar no-print sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="topbar-inner mx-auto flex min-h-[64px] max-w-[100rem] items-center justify-between gap-x-2 px-4 sm:px-4 lg:gap-4 lg:px-6">
              <p className="font-display text-xl lg:text-2xl" style={{ wordSpacing: '0.1em' }}>
                Hub
              </p>
              <nav aria-label="Hub sections" className="ml-auto hidden items-center sm:flex lg:gap-1 [&_.nav-link]:px-2 lg:[&_.nav-link]:px-4">
                {topItems.map(({ id, label, short, to, count }) => (
                  <a key={id} href={to} className="nav-link" aria-label={short ? label : undefined} aria-current={current === id ? 'page' : undefined}>
                    {short ? (
                      <>
                        <span className="lg:hidden">{short}</span>
                        <span className="hidden lg:inline">{label}</span>
                      </>
                    ) : (
                      label
                    )}
                    {count !== undefined && count > 0 && (
                      <span className="nav-count num">
                        {count}
                        <span className="sr-only"> waiting</span>
                      </span>
                    )}
                  </a>
                ))}
                <MoreMenu current={current} placement="below" variant="top" menu={menu} />
              </nav>
              <div className="topbar-tools flex items-center gap-3 max-sm:ml-auto">
                <SyncStatus />
                <GlobalSearch />
              </div>
            </div>
          </header>
          {warnings.length > 0 && (
            <div className="no-print mx-auto max-w-[100rem] px-4 pt-4 sm:px-6">
              <Notice tone="warn">{warnings[0]}</Notice>
            </div>
          )}
          {writeError && (
            <div className="no-print mx-auto max-w-[100rem] px-4 pt-4 sm:px-6" role="alert" data-write-error>
              <Notice tone="bad">
                <span className="flex items-start justify-between gap-3">
                  <span>{writeError}</span>
                  <button type="button" className="btn btn-ghost btn-icon shrink-0" aria-label="Dismiss" onClick={clearWriteError}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </span>
              </Notice>
            </div>
          )}
          {DATA_SOURCE === 'mock' && !s.persistent && (
            <div className="no-print mx-auto max-w-[100rem] px-4 pt-4 sm:px-6">
              <Notice tone="warn">This browser is blocking storage, so changes are kept only until you close this page. Open the Hub in its own tab to keep them.</Notice>
            </div>
          )}
          <main id="main" tabIndex={-1} className={framed ? 'page-frame outline-none' : 'page outline-none'}>
            {live.status === 'error' ? (
              <div className="card mx-auto mt-10 max-w-md text-center" role="alert">
                <p className="mb-4 mt-0 font-bold">{jobText('The %js could not be loaded')}</p>
                <p className="mb-4 text-muted">{live.error}</p>
                <button type="button" className="btn btn-primary btn-lg" onClick={retryLive}>
                  <RefreshCw size={20} aria-hidden="true" />
                  Try again
                </button>
              </div>
            ) : ready && live.status === 'ready' ? (
              children
            ) : (
              <div className="card mx-auto mt-10 max-w-md text-center" role="status">
                <Loader2 size={32} aria-hidden="true" className="mx-auto mb-3 animate-spin text-navy motion-reduce:animate-none" />
                <p className="m-0 text-muted">{status === 'offline' ? 'Offline, retrying' : ready ? jobText('Loading your %js') : 'Loading the Hub'}</p>
              </div>
            )}
          </main>
          <nav aria-label="Hub sections" data-photos={route.name === 'job' ? '' : undefined} className="bottombar no-print sticky bottom-0 z-30 flex sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {bottomItems.map(({ id, label, short, to, Icon, count }) => (
              <a key={id} href={to} className="bottom-item" aria-label={short ? label : undefined} aria-current={current === id ? 'page' : undefined}>
                <Icon size={26} aria-hidden="true" />
                <span>{short ?? label}</span>
                {count !== undefined && count > 0 && <span className="sr-only">, {count} waiting</span>}
              </a>
            ))}
            {route.name === 'job' && (
              <button type="button" className="bottom-item" data-take-photos-bottom aria-label="Take photos" onClick={() => openTakePhotos(route.id)}>
                <Camera size={26} aria-hidden="true" />
                <span>Photos</span>
              </button>
            )}
            <MoreMenu current={current} placement="above" variant="bottom" menu={menu} />
          </nav>
          <ConfirmHost />
        </div>
      </div>
    </div>
  )
}