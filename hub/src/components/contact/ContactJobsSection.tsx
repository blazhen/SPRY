import { jobText, stall } from '../../lib/format'
import { href } from '../../lib/router'
import { MoneyText, StageBadge } from '../ui'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

/** The jobs of this person. Each row links to the job page. */
export function ContactJobsSection({ contactId, compact = false }: ContactSectionProps) {
  const { contact, jobs } = useContactData(contactId)
  if (!contact) return null
  return (
    <CSection
      id="contact-jobs-section"
      title={jobText('%Js')}
      count={jobs.length}
      summary={jobs[0] ? `${jobs[0].name}, ${jobs[0].stage}` : jobText('Not on any %js yet')}
      compact={compact}
    >
      {jobs.length === 0 ? (
        <p className="t-body text-muted">{jobText('Not on any %js yet. Add this person to a %j and it shows here.')}</p>
      ) : (
        <div className="tbl-wrap cp-jobs">
          <table className="tbl tbl-click tbl-stack">
            <caption className="sr-only">{jobText('%Js for this person')}</caption>
            <thead>
              <tr>
                <th scope="col">{jobText('%J')}</th>
                <th scope="col">Stage</th>
                <th scope="col">Days in stage</th>
                <th scope="col" className="num-col col-adv">Value</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const days = stall(j).days
                return (
                  <tr key={j.id}>
                    <th scope="row" data-label={jobText('%J')}>
                      <a href={href.job(j.id)} className="row-link">
                        {j.name}
                      </a>
                    </th>
                    <td data-label="Stage">
                      <StageBadge stage={j.stage} />
                    </td>
                    <td data-label="Days in stage" className="num whitespace-nowrap">
                      {days} {days === 1 ? 'day' : 'days'}
                    </td>
                    <td data-label="Value" className="num-col col-adv">
                      <MoneyText value={j.value} whole /> <span className="t-small text-muted">before GST</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </CSection>
  )
}
