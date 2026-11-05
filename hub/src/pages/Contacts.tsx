import { useState } from 'react'
import './listsPages.css'
import { Search, X } from 'lucide-react'
import { PagerPair } from '../components/Pager'
import { EmptyState, PageHead } from '../components/ui'
import { SortHeader, SortPicker } from '../components/SortHeader'
import { jobText } from '../lib/format'
import { compareNumber, compareText, flipDir, sortBy } from '../lib/sortFilter'
import type { SortDir } from '../lib/sortFilter'
import type { Contact } from '../types'
import { useContactSearch } from '../lib/live'
import { href } from '../lib/router'
import { usePaged } from '../lib/usePaged'
import { getCompany, jobsForContact, useStore } from '../lib/store'

type ContactSort = '' | 'name' | 'company' | 'email' | 'phone' | 'jobs'
type Has = 'all' | 'with' | 'none'

export default function Contacts() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<ContactSort>('')
  const [dir, setDir] = useState<SortDir>('asc')
  const [has, setHas] = useState<Has>('all')
  const term = q.trim().toLowerCase()
  // Live mode: the CRM is searched (after typing stops) and the answers are listed; mock mode filters the local list.
  const srch = useContactSearch(q)
  const found = (srch.rows ?? s.contacts).filter((c) => {
    if (!term || srch.rows) return true
    const company = c.companyId ? getCompany(c.companyId, s)?.name ?? '' : ''
    return [c.name, c.email, c.phone, c.mobile ?? '', company].some((x) => x.toLowerCase().includes(term))
  })

  const withJobs = found.filter((c) => jobsForContact(c.id, s).length > 0).length
  const counts: Record<Has, number> = { all: found.length, with: withJobs, none: found.length - withJobs }
  const list = has === 'all' ? found : found.filter((c) => (jobsForContact(c.id, s).length > 0) === (has === 'with'))
  const HAS: { id: Has; label: string }[] = [
    { id: 'all', label: 'Everyone' },
    { id: 'with', label: jobText('With a %j') },
    { id: 'none', label: jobText('No %j yet') },
  ]

  const companyOf = (c: Contact) => (c.companyId ? getCompany(c.companyId, s)?.name ?? '' : '')
  const rows = !sort
    ? list
    : sortBy(list, (a, b) => {
        switch (sort) {
          case 'name':
            return compareText(a.name, b.name, dir)
          case 'company':
            return compareText(companyOf(a), companyOf(b), dir)
          case 'email':
            return compareText(a.email, b.email, dir)
          case 'phone':
            return compareText(a.mobile || a.phone, b.mobile || b.phone, dir)
          case 'jobs':
            return compareNumber(jobsForContact(a.id, s).length, jobsForContact(b.id, s).length, dir)
        }
      })
  const dirOf = (k: ContactSort): SortDir | null => (sort === k ? dir : null)
  const toggleSort = (k: ContactSort) => {
    if (sort === k) setDir(flipDir(dir))
    else {
      setSort(k)
      setDir(k === 'jobs' ? 'desc' : 'asc')
    }
  }

  const paged = usePaged(rows, { url: true, resetKey: `${term}|${sort}|${dir}|${has}` })

  return (
    <div className="stack-lg lp" data-page="contacts">
      <PageHead title="Contacts" subtitle={jobText('The people on your %js. Open one to see their company, their %js and their quotes.')} />

      <div>
        <label className="label" htmlFor="contact-search">
          Search contacts
        </label>
        <div className="search-box">
          <Search size={20} aria-hidden="true" className="search-icon" />
          <input
            id="contact-search"
            type="search"
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search contacts"
          />
          {q && (
            <button type="button" className="btn btn-ghost btn-icon search-clear" aria-label="Clear search" onClick={() => setQ('')}>
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {found.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          {HAS.map((h) => (
            <button key={h.id} type="button" className="chip" aria-pressed={has === h.id} onClick={() => setHas(h.id)}>
              {h.label}
              <span className="num font-medium">{counts[h.id]}</span>
            </button>
          ))}
        </div>
      )}

      <p className="t-small text-muted" role="status" aria-live="polite">
        {list.length} {list.length === 1 ? 'contact' : 'contacts'}
        {srch.loading ? ' (searching)' : ''}
      </p>
      {srch.error && (
        <p className="err" role="alert">
          {srch.error} Check your connection, then change the search to try again.
        </p>
      )}

      {list.length > 1 && (
        <SortPicker
          id="contact-sort"
          options={[
            { id: 'name', label: 'Name' },
            { id: 'company', label: 'Company' },
            { id: 'email', label: 'Email' },
            { id: 'phone', label: 'Phone' },
            { id: 'jobs', label: jobText('%Js') },
          ]}
          sort={sort || 'name'}
          dir={dir}
          onChange={(k, d) => {
            if (k === (sort || 'name')) {
              setSort(k as ContactSort)
              setDir(d)
            } else toggleSort(k as ContactSort)
          }}
        />
      )}

      {list.length === 0 && srch.loading ? (
        <p className="t-body text-muted" role="status">Loading contacts. One moment.</p>
      ) : list.length === 0 && !term && !srch.error ? (
        <EmptyState title="No contacts yet">{jobText('Contacts appear here when you add a customer to a %j.')}</EmptyState>
      ) : list.length === 0 ? (
        <EmptyState title="No contacts match">
          Try a different name, company, phone or email, or show everyone.
          <div className="mt-4">
            <button type="button" className="btn btn-neutral" onClick={() => { setQ(''); setHas('all') }}>
              Show everyone
            </button>
          </div>
        </EmptyState>
      ) : (
        <PagerPair paged={paged} noun="contacts">
        <div className="tbl-wrap">
          <table className="tbl tbl-click tbl-stack tbl-contacts">
            <caption className="sr-only">Contacts</caption>
            <thead>
              <tr>
                <SortHeader dir={dirOf('name')} onSort={() => toggleSort('name')}>
                  Name
                </SortHeader>
                <SortHeader dir={dirOf('company')} onSort={() => toggleSort('company')}>
                  Company
                </SortHeader>
                <SortHeader className="col-email" dir={dirOf('email')} onSort={() => toggleSort('email')}>
                  Email
                </SortHeader>
                <SortHeader dir={dirOf('phone')} onSort={() => toggleSort('phone')}>
                  Phone
                </SortHeader>
                <SortHeader className="jobs-col" dir={dirOf('jobs')} onSort={() => toggleSort('jobs')}>
                  {jobText('%Js')}
                </SortHeader>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((c) => {
                const company = c.companyId ? getCompany(c.companyId, s)?.name : undefined
                const phone = c.mobile || c.phone
                const jobs = jobsForContact(c.id, s)
                const n = jobs.length
                return (
                  <tr key={c.id}>
                    <th scope="row" data-label="Name">
                      <a href={href.contact(c.id)} className="row-link">
                        {c.name}
                      </a>
                    </th>
                    <td data-label="Company">{company ?? ''}</td>
                    <td data-label="Email" className="break-words col-email">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="cell-link">
                          {c.email}
                        </a>
                      )}
                    </td>
                    <td data-label="Phone">
                      {phone && (
                        <a href={`tel:${phone.replace(/\s+/g, '')}`} className="cell-link">
                          {phone}
                        </a>
                      )}
                    </td>
                    <td data-label={jobText('%Js')} className="jobs-col">
                      <span className="num font-bold">
                        {n} {n === 1 ? jobText('%j') : jobText('%js')}
                      </span>
                      {n > 0 && (
                        <span className="job-pills">
                          {jobs.slice(0, 2).map((j) => (
                            <a key={j.id} href={href.job(j.id)} className="job-pill cell-link" title={j.name}>
                              {j.name}
                            </a>
                          ))}
                          {n > 2 && <span className="job-more">+{n - 2} more</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </PagerPair>
      )}
      {srch.hasMore && (
        <p>
          <button type="button" className="btn btn-neutral" onClick={srch.more} disabled={srch.loading}>
            Load more contacts
          </button>
        </p>
      )}
    </div>
  )
}
