import { useEffect, useState } from 'react'

/**
 * Hash routes, so the static build works inside an iframe from any address with
 * no server rewrites and no cookies. The default route is #/todo.
 *
 *   #/todo            jobs waiting for a quote
 *   #/jobs            job list with search and filters
 *   #/jobs/:id        job screen
 *   #/quotes          all quotes
 *   #/quote/:id       quote editor
 *   #/view/:id        customer view
 *   #/contacts        contacts (#/contacts/:id for one contact)
 *   #/templates       templates
 *   #/terms           terms library
 *   #/prices          price list
 *   #/week            this week
 *   #/settings        settings (stall limits)
 *   #/invoices        all invoices (#/invoices/:id one invoice, #/invoices/:id/edit edit it,
 *                     #/invoices/new?job=ID start a new one)
 */
export type Route =
  | { name: 'todo' }
  | { name: 'jobs' }
  | { name: 'job'; id: string }
  | { name: 'quotes' }
  | { name: 'edit'; id: string }
  | { name: 'view'; id: string }
  | { name: 'contacts' }
  | { name: 'contact'; id: string }
  | { name: 'templates' }
  | { name: 'terms' }
  | { name: 'prices' }
  | { name: 'week' }
  | { name: 'settings' }
  | { name: 'invoices' }
  | { name: 'invoice'; id: string }
  | { name: 'invoiceNew'; jobId?: string }
  | { name: 'invoiceEdit'; id: string }

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/'
  const [path] = raw.split('?')
  const parts = path.split('/').filter(Boolean)
  const id = parts[1] ? decodeURIComponent(parts[1]) : undefined
  switch (parts[0]) {
    case 'jobs':
      return id ? { name: 'job', id } : { name: 'jobs' }
    case 'quotes':
      return { name: 'quotes' }
    case 'quote':
      return id ? { name: 'edit', id } : { name: 'quotes' }
    case 'view':
      return id ? { name: 'view', id } : { name: 'quotes' }
    case 'contacts':
      return id ? { name: 'contact', id } : { name: 'contacts' }
    case 'templates':
      return { name: 'templates' }
    case 'terms':
      return { name: 'terms' }
    case 'prices':
      return { name: 'prices' }
    case 'week':
      return { name: 'week' }
    case 'settings':
      return { name: 'settings' }
    case 'invoices':
      if (id === 'new') return { name: 'invoiceNew', jobId: new URLSearchParams(raw.split('?')[1] ?? '').get('job') ?? undefined }
      if (id && parts[2] === 'edit') return { name: 'invoiceEdit', id }
      return id ? { name: 'invoice', id } : { name: 'invoices' }
    default:
      return { name: 'todo' }
  }
}

export const href = {
  todo: () => '#/todo',
  jobs: () => '#/jobs',
  job: (id: string) => `#/jobs/${encodeURIComponent(id)}`,
  quotes: () => '#/quotes',
  edit: (id: string) => `#/quote/${encodeURIComponent(id)}`,
  view: (id: string, key?: string) => `#/view/${encodeURIComponent(id)}${key ? `?k=${encodeURIComponent(key)}` : ''}`,
  contacts: () => '#/contacts',
  contact: (id: string) => `#/contacts/${encodeURIComponent(id)}`,
  templates: () => '#/templates',
  terms: () => '#/terms',
  prices: () => '#/prices',
  week: () => '#/week',
  settings: () => '#/settings',
  invoices: () => '#/invoices',
  invoice: (id: string) => `#/invoices/${encodeURIComponent(id)}`,
  /** New invoice. With a job id the job is already chosen. */
  invoiceNew: (jobId?: string) => (jobId ? `#/invoices/new?job=${encodeURIComponent(jobId)}` : '#/invoices/new'),
  invoiceEdit: (id: string) => `#/invoices/${encodeURIComponent(id)}/edit`,
}

export const go = (to: string, replace = false) => {
  if (replace) window.location.replace(to)
  else window.location.hash = to.replace(/^#/, '')
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
