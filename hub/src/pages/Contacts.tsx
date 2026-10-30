import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { PagerPair } from '../components/Pager'
import { EmptyState, PageHead } from '../components/ui'
import { jobText } from '../lib/format'
import { useContactSearch } from '../lib/live'
import { href } from '../lib/router'
import { usePaged } from '../lib/usePaged'
import { getCompany, jobsForContact, useStore } from '../lib/store'

export default function Contacts() {
  const s = useStore()
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  // Live mode: the CRM is searched (after typing stops) and the answers are listed; mock mode filters the local list.
  const srch = useContactSearch(q)
  const list = (srch.rows ?? s.contacts).filter((c) => {
    if (!term || srch.rows) return true
    const company = c.companyId ? getCompany(c.companyId, s)?.name ?? '' : ''
    return [c.name, c.email, c.phone, c.mobile ?? '', company].some((x) => x.toLowerCase().includes(term))
  })

  const paged = usePaged(list, { url: true, resetKey: term })

  return (
    <div className="stack-lg">
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
            placeholder="Search by name, company, phone or email"
          />
          {q && (
            <button type="button" className="btn btn-ghost btn-icon search-clear" aria-label="Clear search" onClick={() => setQ('')}>
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <p className="t-small text-muted" role="status" aria-live="polite">
        {list.length} {list.length === 1 ? 'contact' : 'contacts'}
        {srch.loading ? ' (searching)' : ''}
      </p>
      {srch.error && (
        <p className="err" role="alert">
          {srch.error}
        </p>
      )}

      {list.length === 0 && srch.loading ? (
        <p className="t-body text-muted">Loading contacts</p>
      ) : list.length === 0 && !term && !srch.error ? (
        <EmptyState title="No contacts yet">{jobText('Contacts appear here when you add a customer to a %j.')}</EmptyState>
      ) : list.length === 0 ? (
        <EmptyState title="No contacts match your search">
          Try a different name, company, phone or email.
          <div className="mt-4">
            <button type="button" className="btn btn-quiet btn-lg" onClick={() => setQ('')}>
              Clear search
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
                <th scope="col">Name</th>
                <th scope="col">Company</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col" className="jobs-col">
                  {jobText('%Js')}
                </th>
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
                    <td data-label="Email" className="break-words">
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
          <button type="button" className="btn btn-quiet btn-lg" onClick={srch.more} disabled={srch.loading}>
            Load more contacts
          </button>
        </p>
      )}
    </div>
  )
}
