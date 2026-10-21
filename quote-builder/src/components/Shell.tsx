import { useEffect, useState, type ReactNode } from 'react'
import { FileText, LayoutTemplate, Moon, Plus, Sun } from 'lucide-react'
import logoDark from '../assets/logo-light.png'
import logo from '../assets/logo.png'
import { href, type Route } from '../lib/router'
import { useStore } from '../lib/store'
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

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { theme, toggle } = useTheme()
  const { persistent } = useStore()
  const inQuotes = route.name === 'list' || route.name === 'new' || route.name === 'edit'
  return (
    <div className="min-h-screen">
      <a href="#main" className="skip no-print" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Skip to content
      </a>
      <header className="no-print sticky top-0 z-30 border-b rule bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[92rem] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 sm:px-6">
          <a href={href.list()} className="flex items-center gap-2" aria-label="SprayIT Solutions quote builder, home">
            <img src={theme === 'dark' ? logoDark : logo} alt="" width={69} height={42} className="h-9 w-auto" />
            <span className="hidden font-display text-lg sm:inline">Quote Builder</span>
          </a>
          <nav aria-label="Main" className="order-3 -mb-px flex w-full gap-1 sm:order-none sm:ml-2 sm:w-auto">
            <NavLink to={href.list()} current={inQuotes} icon={<FileText size={18} aria-hidden="true" />}>
              Quotes
            </NavLink>
            <NavLink to={href.templates()} current={route.name === 'templates'} icon={<LayoutTemplate size={18} aria-hidden="true" />}>
              Templates
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="btn btn-quiet btn-icon"
              onClick={toggle}
              aria-pressed={theme === 'dark'}
              aria-label="Dark theme"
              title="Dark theme"
            >
              {theme === 'dark' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
            </button>
            <a href={href.new()} className="btn btn-primary">
              <Plus size={18} aria-hidden="true" />
              <span>New quote</span>
            </a>
          </div>
        </div>
      </header>
      {!persistent && (
        <div className="no-print mx-auto max-w-[92rem] px-4 pt-4 sm:px-6">
          <Notice tone="warn">
            This browser is blocking storage, so drafts are kept only until you close this page. Open the quote builder in its own tab to keep them.
          </Notice>
        </div>
      )}
      <main id="main" tabIndex={-1} className="mx-auto max-w-[92rem] px-4 py-6 outline-none sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}

function NavLink({ to, current, icon, children }: { to: string; current: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <a
      href={to}
      aria-current={current ? 'page' : undefined}
      className="inline-flex min-h-[44px] items-center gap-2 border-b-[3px] px-3 text-[0.9375rem] font-bold hover:bg-navy-wash"
      style={{ borderColor: current ? 'rgb(var(--c-navy))' : 'transparent', color: current ? 'rgb(var(--c-navy))' : 'rgb(var(--c-ink))' }}
    >
      {icon}
      {children}
    </a>
  )
}
