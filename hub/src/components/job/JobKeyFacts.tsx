import { Plus } from 'lucide-react'
import { MainContact, SiteAddress, JobNotes, goToPeople, jobContacts } from './JobFacts'
import { getJob, useStore } from '../../lib/store'
import './jobFacts.css'
import './jobLeft.css'

/** The key facts, always showing at the top of a job. Who (name, phone, email), where (the JOB SITE) and the job notes. */
export function JobKeyFacts({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  if (!job) return null
  const { main } = jobContacts(job, s)

  return (
    <section className="jl-key" aria-label="Key facts about this job">
      <SiteAddress job={job} />
      <JobNotes job={job} />
      {main ? (
        <MainContact c={main} part="key" />
      ) : (
        <div className="jl-empty">
          <p className="t-body">No contact yet.</p>
          <button type="button" className="btn btn-add" onClick={goToPeople}>
            <Plus size={16} aria-hidden="true" />
            Add a contact
          </button>
        </div>
      )}
    </section>
  )
}
