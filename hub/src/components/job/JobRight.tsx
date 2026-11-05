import { JobSide } from './JobSide'

/** RIGHT panel: quotes, linked contacts, files, invoices, pinned notes. `railed` is false where there is no icon rail (phone, tablet). */
export function JobRight({ jobId, railed = true }: { jobId: string; railed?: boolean }) {
  return <JobSide jobId={jobId} railed={railed} />
}
