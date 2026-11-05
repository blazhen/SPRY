import { useAttachments, type Attachment } from './attachments'

/** An attachment that is a site photo (it carries photo details). */
export type Photo = Attachment & { photo: NonNullable<Attachment['photo']> }
export const isPhoto = (a: Attachment): a is Photo => !!a.photo

/** The site photos of one job, newest first. */
export function usePhotos(jobId: string): Photo[] {
  return useAttachments(jobId).filter(isPhoto).sort((a, b) => (b.photo.takenAt || b.addedAt).localeCompare(a.photo.takenAt || a.addedAt))
}
