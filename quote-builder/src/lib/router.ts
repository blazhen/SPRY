import { useEffect, useState } from 'react'

/**
 * Hash routes, so the static build works inside an iframe from any address with
 * no server rewrites and no cookies.
 *
 *   #/                list of quotes
 *   #/new             new quote (optional ?job=ID&addon=1)
 *   #/quote/:id       editor
 *   #/view/:id        customer view
 *   #/templates       templates
 */
export type Route =
  | { name: 'list' }
  | { name: 'new'; jobId?: string; addOn: boolean; templateId?: string; nonce: number }
  | { name: 'edit'; id: string }
  | { name: 'view'; id: string }
  | { name: 'templates' }

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  const q = new URLSearchParams(query)
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'new') {
    return { name: 'new', jobId: q.get('job') || undefined, addOn: q.get('addon') === '1', templateId: q.get('template') || undefined, nonce: Math.random() }
  }
  if (parts[0] === 'quote' && parts[1]) return { name: 'edit', id: decodeURIComponent(parts[1]) }
  if (parts[0] === 'view' && parts[1]) return { name: 'view', id: decodeURIComponent(parts[1]) }
  if (parts[0] === 'templates') return { name: 'templates' }
  return { name: 'list' }
}

export const href = {
  list: () => '#/',
  new: (opts?: { jobId?: string; addOn?: boolean; templateId?: string }) => {
    const q = new URLSearchParams()
    if (opts?.jobId) q.set('job', opts.jobId)
    if (opts?.addOn) q.set('addon', '1')
    if (opts?.templateId) q.set('template', opts.templateId)
    const s = q.toString()
    return '#/new' + (s ? '?' + s : '')
  },
  edit: (id: string) => `#/quote/${encodeURIComponent(id)}`,
  view: (id: string) => `#/view/${encodeURIComponent(id)}`,
  templates: () => '#/templates',
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
