import { DATA_SOURCE } from '../../config'
import { useContactConversations } from '../../lib/conversations'
import { useContactInvoices, useLiveTasks } from '../../lib/live'
import { followUpFor, useNotesStore } from '../../lib/notesStore'
import { compareTasks } from '../../lib/tasks'
import {
  eventsForJob,
  getCompany,
  getContact,
  invoicesForContact,
  jobsForContact,
  messagesForContact,
  messagesForJob,
  quotesForContact,
  taskLoadState,
  tasksForContact,
  useStore,
} from '../../lib/store'
import { extraFor } from '../../data/notes'
import type { Company, Job, JobTask } from '../../types'

export type ContactTask = JobTask & { job?: Job }

/**
 * Everything the contact sections need, worked out from the store. Each section calls this on its own, so a section works
 * when drawn alone, in any panel, in any order. Live: the CRM's tasks, invoices and conversations of this person load here.
 */
export function useContactData(contactId: string) {
  const s = useStore()
  const ns = useNotesStore()
  const LIVE = DATA_SOURCE === 'live'
  useLiveTasks(contactId ? [contactId] : [])
  useContactInvoices(contactId)
  const { messages: liveMsgs } = useContactConversations(contactId)
  const contact = getContact(contactId, s)

  const jobs = contact ? jobsForContact(contact.id, s) : []

  // Companies: their own, plus any company on their jobs.
  const companies: Company[] = []
  const addCo = (c?: Company) => {
    if (c && !companies.some((x) => x.id === c.id)) companies.push(c)
  }
  if (contact?.companyId) addCo(getCompany(contact.companyId, s))
  jobs.forEach((j) => j.participants.filter((p) => p.kind === 'company').forEach((p) => addCo(getCompany(p.id, s))))

  // Messages: theirs, plus any on their jobs with no person set. Newest first. Live: real CRM conversations merged in.
  const direct = contact ? messagesForContact(contact.id, s) : []
  const seen = new Set(direct.map((m) => m.id))
  const onJobs = jobs.flatMap((j) => messagesForJob(j.id, s)).filter((m) => !m.contactId && !seen.has(m.id))
  liveMsgs.forEach((m) => seen.add(m.id))
  const messages = [...direct, ...onJobs, ...liveMsgs].sort((a, b) => (a.at < b.at ? 1 : -1))
  const last: string | undefined = messages[0]?.at

  const events = jobs.flatMap((j) => eventsForJob(j.id, s).map((e) => ({ ...e, jobName: j.name }))).sort((a, b) => (a.at < b.at ? 1 : -1))
  const taskState = taskLoadState([contactId])
  // Live: the CRM keeps tasks on the person, so they are listed here without a job.
  const tasks: ContactTask[] = LIVE
    ? tasksForContact(contactId)
    : jobs.flatMap((j) => j.tasks.map((t) => ({ ...t, job: j }))).sort((a, b) => Number(a.done) - Number(b.done) || compareTasks(a, b))

  return {
    s,
    LIVE,
    contact,
    extra: contact ? extraFor(contact.id) : undefined,
    jobs,
    companies,
    messages,
    last,
    events,
    tasks,
    taskState,
    nextFollow: contact ? followUpFor({ kind: 'contact', id: contact.id }, ns) : undefined,
    phone: contact ? contact.mobile || contact.phone : undefined,
    contactInvoices: contact ? invoicesForContact(contact.id, s) : [],
    contactQuotes: contact ? quotesForContact(contact.id, s) : [],
  }
}
