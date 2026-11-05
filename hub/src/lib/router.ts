import { useEffect, useState } from 'react'
import { BOXES, type BoxId } from './jobLayout'

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
/**
 * What the job page workspace shows in its middle and right panels (Round 8).
 *   #/jobs/:id/quote/:qid               the quote builder, with the preview on the right
 *   #/jobs/:id/invoice/:iid             one invoice
 *   #/jobs/:id/invoice/:iid/edit        the invoice editor
 *   #/jobs/:id/invoice/new              a new invoice for this job
 */
export type JobWork = { kind: 'quote' | 'invoice' | 'invoiceEdit' | 'invoiceNew'; id: string }

/** Focus views of the contact page (Round 8, stage 6): #/contacts/<id>/<view>. */
export const CONTACT_VIEWS = ['notes', 'tasks', 'messages', 'jobs', 'quotes', 'invoices', 'documents'] as const
export type ContactView = (typeof CONTACT_VIEWS)[number]

export type Route =
  | { name: 'todo' }
  | { name: 'jobs' }
  | { name: 'job'; id: string; work?: JobWork; view?: BoxId }
  | { name: 'quotes' }
  | { name: 'edit'; id: string }
  | { name: 'view'; id: string }
  | { name: 'contacts' }
  | { name: 'contact'; id: string; view?: ContactView }
  | { name: 'templates' }
  | { name: 'terms' }
  | { name: 'prices' }
  | { name: 'week' }
  | { name: 'calendar' }
  | { name: 'enquiry' }
  | { name: 'daysheet' }
  | { name: 'settings' }
  | { name: 'foam' }
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
      if (!id) return { name: 'jobs' }
      if (parts[2] === 'quote' && parts[3]) return { name: 'job', id, work: { kind: 'quote', id: decodeURIComponent(parts[3]) } }
      if (parts[2] === 'invoice' && parts[3] === 'new') return { name: 'job', id, work: { kind: 'invoiceNew', id: '' } }
      if (parts[2] === 'invoice' && parts[3]) return { name: 'job', id, work: { kind: parts[4] === 'edit' ? 'invoiceEdit' : 'invoice', id: decodeURIComponent(parts[3]) } }
      if (parts[2] && BOXES.some((b) => b.id === parts[2])) return { name: 'job', id, view: parts[2] as BoxId }
      return { name: 'job', id }
    case 'quotes':
      return { name: 'quotes' }
    case 'quote':
      return id ? { name: 'edit', id } : { name: 'quotes' }
    case 'view':
      return id ? { name: 'view', id } : { name: 'quotes' }
    case 'contacts':
      if (id && parts[2] && (CONTACT_VIEWS as readonly string[]).includes(parts[2])) return { name: 'contact', id, view: parts[2] as ContactView }
      return id ? { name: 'contact', id } : { name: 'contacts' }
    case 'templates':
      return { name: 'templates' }
    case 'terms':
      return { name: 'terms' }
    case 'prices':
      return { name: 'prices' }
    case 'week':
      return { name: 'week' }
    case 'calendar':
      return { name: 'calendar' }
    case 'enquiry':
      return { name: 'enquiry' }
    case 'day':
      return { name: 'daysheet' }
    case 'settings':
      return { name: 'settings' }
    case 'foam':
      return { name: 'foam' }
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
  /** The workspace address: this job's page with the quote builder in the middle. */
  /** A focus view of the job page: the middle panel shows one box (and its composer). */
  jobView: (jobId: string, view: string) => `#/jobs/${encodeURIComponent(jobId)}/${view}`,
  jobQuote: (jobId: string, quoteId: string) => `#/jobs/${encodeURIComponent(jobId)}/quote/${encodeURIComponent(quoteId)}`,
  jobInvoice: (jobId: string, invoiceId: string) => `#/jobs/${encodeURIComponent(jobId)}/invoice/${encodeURIComponent(invoiceId)}`,
  jobInvoiceEdit: (jobId: string, invoiceId: string) => `#/jobs/${encodeURIComponent(jobId)}/invoice/${encodeURIComponent(invoiceId)}/edit`,
  jobInvoiceNew: (jobId: string) => `#/jobs/${encodeURIComponent(jobId)}/invoice/new`,
  quotes: () => '#/quotes',
  edit: (id: string) => `#/quote/${encodeURIComponent(id)}`,
  view: (id: string, key?: string) => `#/view/${encodeURIComponent(id)}${key ? `?k=${encodeURIComponent(key)}` : ''}`,
  contacts: () => '#/contacts',
  contact: (id: string) => `#/contacts/${encodeURIComponent(id)}`,
  contactView: (id: string, view: string) => `#/contacts/${encodeURIComponent(id)}/${view}`,
  templates: () => '#/templates',
  terms: () => '#/terms',
  prices: () => '#/prices',
  week: () => '#/week',
  calendar: () => '#/calendar',
  /** Advanced extras. */
  enquiry: () => '#/enquiry',
  daysheet: () => '#/day',
  settings: () => '#/settings',
  foam: () => '#/foam',
  invoices: () => '#/invoices',
  invoice: (id: string) => `#/invoices/${encodeURIComponent(id)}`,
  /** New invoice. With a job id the job is already chosen. */
  invoiceNew: (jobId?: string) => (jobId ? `#/invoices/new?job=${encodeURIComponent(jobId)}` : '#/invoices/new'),
  invoiceEdit: (id: string) => `#/invoices/${encodeURIComponent(id)}/edit`,
}

/** The job page becomes a workspace (builder in the middle, preview on the right) from this width up. Below it, the full pages. */
export const WORKSPACE_MQ = '(min-width: 1100px)'
export const workspaceWide = () => typeof window !== 'undefined' && window.matchMedia(WORKSPACE_MQ).matches

/** Where a quote opens when the link sits on a job page: the workspace on wide screens, its own page otherwise. */
export const quoteOnJob = (jobId: string, quoteId: string) => (workspaceWide() ? href.jobQuote(jobId, quoteId) : href.edit(quoteId))

const onJobPage = () => typeof window !== 'undefined' && window.location.hash.startsWith('#/jobs/')

/** Invoice links that sit on a job page open in the workspace on wide screens. From any other page they open the full page. */
export const invoiceOnJob = (jobId: string, invoiceId: string) => (workspaceWide() && onJobPage() ? href.jobInvoice(jobId, invoiceId) : href.invoice(invoiceId))
export const invoiceEditOnJob = (jobId: string, invoiceId: string) => (workspaceWide() && onJobPage() ? href.jobInvoiceEdit(jobId, invoiceId) : href.invoiceEdit(invoiceId))

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
