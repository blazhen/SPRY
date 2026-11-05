import { TriangleAlert } from 'lucide-react'
import { Notice } from '../ui'
import { href } from '../../lib/router'
import { sameCompanyOnJob } from '../../lib/sameCompany'
import { getJob, useStore } from '../../lib/store'

/** A warning with a link to each person when two people from one company are on the same job. */
export function SameCompanyNotice({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  if (!job) return null
  const groups = sameCompanyOnJob(job, s)
  if (groups.length === 0) return null
  return (
    <div className="stack" data-testid="same-company-notice">
      {groups.map((g) => (
        <Notice key={g.company} tone="warn">
          <p className="t-body">
            <TriangleAlert size={18} aria-hidden="true" className="mr-1 inline align-text-bottom" />
            <strong>{g.people.length} people from {g.company}</strong> are on this job. Check who is asking, who the quote is for and who pays.
          </p>
          <ul className="mt-1">
            {g.people.map((c) => (
              <li key={c.id}>
                <a className="cell-link" href={href.contact(c.id)}>
                  {c.name || 'No name'}
                </a>
              </li>
            ))}
          </ul>
        </Notice>
      ))}
    </div>
  )
}
