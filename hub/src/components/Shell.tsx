import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Briefcase, CalendarDays, FileText, ListChecks, Loader2, MoreHorizontal, Moon, Receipt, RefreshCw, Sun, Users, X } from 'lucide-react'
import { DATA_SOURCE } from '../config'
import { jobText } from '../lib/format'
import { href, type Route } from '../lib/router'
import { retryLive, startLive, useLive } from '../lib/live'
import { stageWarnings, todoQueue, useStore } from '../lib/store'
import { startSync, useSync } from '../lib/sync'
import { clearWriteError, useWriteError } from '../lib/writeError'
import { recordFromHash } from '../lib/recent'
import { GlobalSearch } from './GlobalSearch'
import { SyncStatus } from './SyncStatus'
import { Notice } from './ui'

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'))
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem('sq.theme', next)
    } catch {
      /* storage blocked: the choice lasts for this visit only */
    }
  }
  return { theme, toggle }
}

type TabId = 'todo' | 'jobs' | 'quotes' | 'invoices' | 'contacts' | 'week' | 'templates' | 'terms' | 'prices' | 'settings'

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
    case 'templates': return 'templates'
    case 'terms': return 'terms'
    case 'prices': return 'prices'
    case 'settings': return 'settings'
    default: return null
  }
}

const MORE: { id: TabId; label: string; to: string }[] = [
  { id: 'templates', label: 'Templates', to: href.templates() },
  { id: 'terms', label: 'Terms', to: href.terms() },
  { id: 'prices', label: 'Price list', to: href.prices() },
  { id: 'settings', label: 'Settings', to: href.settings() },
]

/** The More menu: a button that opens a short list. Escape and outside clicks close it. */
function MoreMenu({ current, theme, onToggleTheme, placement, variant }: { current: TabId | null; theme: 'light' | 'dark'; onToggleTheme: () => void; placement: 'below' | 'above'; variant: 'top' | 'bottom' }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const id = useId()
  // On a phone the bottom bar keeps five tabs at a readable size, so This week lives in More.
  const menu = variant === 'bottom' ? [{ id: 'week' as TabId, label: 'This week', to: href.week() }, ...MORE] : MORE
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
          <div className="mt-2 border-t pt-3 rule px-2">
            <p className="mb-2 text-[0.9375rem] font-bold text-muted">Display</p>
            <button type="button" className="chip" onClick={onToggleTheme} aria-pressed={theme === 'dark'}>
              {theme === 'dark' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
              Dark theme
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { theme, toggle } = useTheme()
  const s = useStore()
  const current = tabFor(route)
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

  const items: { id: TabId; label: string; short?: string; to: string; Icon: typeof Briefcase; count?: number }[] = [
    { id: 'todo', label: 'To do', to: href.todo(), Icon: ListChecks, count: waiting },
    { id: 'jobs', label: 'Jobs', to: href.jobs(), Icon: Briefcase },
    { id: 'quotes', label: 'Quotes', to: href.quotes(), Icon: FileText },
    { id: 'invoices', label: 'Invoices', to: href.invoices(), Icon: Receipt },
    { id: 'contacts', label: 'Contacts', to: href.contacts(), Icon: Users },
    { id: 'week', label: 'This week', short: 'Week', to: href.week(), Icon: CalendarDays },
  ]

  return (
    <div style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <a href="#main" className="skip no-print" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Skip to content
      </a>
      <div>
        <div className="min-w-0">
          <header className="topbar no-print sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="mx-auto flex min-h-[64px] max-w-[100rem] items-center justify-between gap-2 px-4 sm:px-4 lg:gap-4 lg:px-6">
              <p className="font-display text-xl lg:text-2xl" style={{ wordSpacing: '0.1em' }}>
                Quote Hub
              </p>
              <nav aria-label="Quote Hub sections" className="ml-auto hidden items-center sm:flex lg:gap-1 [&_.nav-link]:px-2 lg:[&_.nav-link]:px-4">
                {items.map(({ id, label, short, to, count }) => (
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
                <MoreMenu current={current} theme={theme} onToggleTheme={toggle} placement="below" variant="top" />
              </nav>
              <div className="flex items-center gap-3 max-sm:ml-auto">
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
              <Notice tone="warn">This browser is blocking storage, so changes are kept only until you close this page. Open the Quote Hub in its own tab to keep them.</Notice>
            </div>
          )}
          <main id="main" tabIndex={-1} className="page outline-none">
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
                <p className="m-0 text-muted">{status === 'offline' ? 'Offline, retrying' : ready ? jobText('Loading your %js') : 'Loading the Quote Hub'}</p>
              </div>
            )}
          </main>
          <nav aria-label="Quote Hub sections" className="bottombar no-print sticky bottom-0 z-30 flex sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {items.filter((i) => i.id !== 'week').map(({ id, label, short, to, Icon, count }) => (
              <a key={id} href={to} className="bottom-item" aria-label={short ? label : undefined} aria-current={current === id ? 'page' : undefined}>
                <Icon size={26} aria-hidden="true" />
                <span>{short ?? label}</span>
                {count !== undefined && count > 0 && <span className="sr-only">, {count} waiting</span>}
              </a>
            ))}
            <MoreMenu current={current} theme={theme} onToggleTheme={toggle} placement="above" variant="bottom" />
          </nav>
        </div>
      </div>
    </div>
  )
}
