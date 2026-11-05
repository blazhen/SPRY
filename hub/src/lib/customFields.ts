import { DATA_SOURCE } from '../config'
import { contactFieldsApi, contactFromApi, jobFromApi, jobsApi } from './api'
import { getContact, getJob, liveMergeContacts, liveMergeJobs } from './store'
import type { Contact, Job } from '../types'

const LIVE = DATA_SOURCE === 'live'

/**
 * Live mode: write a contact's custom field values back to the CRM (PUT /api/contact-fields).
 * Mock mode: no-op (there are no CRM fields to write to).
 * Returns the updated contact, or undefined when the write was skipped or failed.
 */
export async function saveContactCustomFields(
  contactId: string,
  values: { id: string; value: string | number }[],
): Promise<Contact | undefined> {
  if (!LIVE || !contactId) return undefined
  const before = getContact(contactId)
  try {
    const row = await contactFieldsApi.update(contactId, values)
    const c: Contact = contactFromApi(row)
    liveMergeContacts([c])
    return c
  } catch {
    if (before) liveMergeContacts([before])
    return undefined
  }
}

/**
 * Live mode: write a job's opportunity custom fields back to the CRM (PUT /api/job with customFields).
 * Mock mode: no-op. Merges the returned job so the UI reflects the CRM straight away.
 */
export async function saveJobCustomFields(
  jobId: string,
  customFields: NonNullable<Job['customFields']>,
): Promise<Job | undefined> {
  if (!LIVE || !jobId) return undefined
  const before = getJob(jobId)
  try {
    const row = await jobsApi.update(jobId, {
      customFields: customFields.map((f) => ({ id: f.id, value: (f.value ?? '') as string | number })),
    })
    liveMergeJobs([jobFromApi(row)])
    return getJob(jobId)
  } catch {
    if (before) liveMergeJobs([before])
    return undefined
  }
}