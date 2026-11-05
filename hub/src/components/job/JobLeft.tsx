import { LeftPanel } from './LeftTabs'

/**
 * LEFT panel: the boxes Edit layout put here, by default the Job, Contact and Company boxes (name, site address, notes,
 * stage, value, owner, the person with phone and email, and the company), with a switch at the top: All | Job | Contact | Company.
 * Everything is shown.
 */
export function JobLeft({ jobId }: { jobId: string }) {
  return <LeftPanel jobId={jobId} />
}
