import type { ReactNode } from 'react'
import { PhotosBox } from '../photos/PhotosBox'
import { Composer, type ComposeMode } from './Composer'
import { ContactsPanel } from './ContactsPanel'
import { JobCosting } from './JobCosting'
import { JobInvoices } from './PaymentsPanel'
import { PinnedNotes } from './PinnedNotes'
import { QuoteFamily } from './QuoteFamily'
import { Section } from './Section'
import { InspectionNotes } from '../../pages/InspectionNotes'
import { StampBar } from './StampBar'
import { OpenTasksSection } from './TasksPanel'
import { AddEmailBox, AddNoteBox, AddTaskBox, AddTextBox, MapBox, QuickActionsBox, QuotePreviewBox, StageBox } from './boxes/LibraryA'
import { CallsBox, DocumentsBox, EmailsBox, HistoryBox, NotesAllBox, TextsBox, VisitsBox } from './boxes/LibraryB'
import { CompanyBox, ContactBox, JobBox } from './boxes/LeftBoxes'
import { MoneySummaryBox, NextActionBox, OtherJobsBox, PaymentsBox, RecentFilesBox, SiteAccessBox } from './boxes/NewBoxes'
import type { BoxId } from '../../lib/jobLayout'

/**
 * One box of the job page, by id. Every panel (left, middle, right) draws its boxes through here, so a box looks and
 * works the same wherever Edit layout puts it. `fields` only matters for Job, Contact and Company.
 */
export function renderBox(id: BoxId, jobId: string, st?: { fields?: string[]; settings?: Record<string, string[] | string> }): ReactNode {
  const fields = st?.fields
  switch (id) {
    case 'job': return <JobBox jobId={jobId} fields={fields} />
    case 'contact': return <ContactBox jobId={jobId} fields={fields} />
    case 'company': return <CompanyBox jobId={jobId} fields={fields} />
    case 'notes': return <Composer jobId={jobId} modes={Array.isArray(st?.settings?.modes) ? (st.settings.modes as ComposeMode[]) : undefined} />
    case 'tasks': return <OpenTasksSection jobId={jobId} />
    case 'history': return <HistoryBox jobId={jobId} settings={st?.settings} />
    case 'milestones':
      return (
        <Section id="job-milestones-section" title="Milestones">
          <StampBar jobId={jobId} quiet />
        </Section>
      )
    case 'quotes': return <QuoteFamily jobId={jobId} />
    case 'people': return <ContactsPanel jobId={jobId} />
    case 'documents': return <DocumentsBox jobId={jobId} settings={st?.settings} />
    case 'photos': return <PhotosBox jobId={jobId} />
    case 'invoices': return <JobInvoices jobId={jobId} />
    case 'payments': return <PaymentsBox jobId={jobId} />
    case 'costing': return <JobCosting jobId={jobId} />
    case 'pinned': return <PinnedNotes jobId={jobId} />
    case 'next': return <NextActionBox jobId={jobId} />
    case 'money': return <MoneySummaryBox jobId={jobId} />
    case 'otherJobs': return <OtherJobsBox jobId={jobId} />
    case 'siteAccess': return <SiteAccessBox jobId={jobId} />
    case 'recentFiles': return <RecentFilesBox jobId={jobId} />
    case 'addNote': return <AddNoteBox jobId={jobId} />
    case 'addText': return <AddTextBox jobId={jobId} />
    case 'addEmail': return <AddEmailBox jobId={jobId} />
    case 'addTask': return <AddTaskBox jobId={jobId} />
    case 'notesAll': return <NotesAllBox jobId={jobId} />
    case 'texts': return <TextsBox jobId={jobId} />
    case 'emails': return <EmailsBox jobId={jobId} />
    case 'calls': return <CallsBox jobId={jobId} />
    case 'visits': return <VisitsBox jobId={jobId} />
    case 'quotePreview': return <QuotePreviewBox jobId={jobId} />
    case 'map': return <MapBox jobId={jobId} />
    case 'stage': return <StageBox jobId={jobId} />
    case 'quickActions': return <QuickActionsBox jobId={jobId} />
    case 'inspection': return <InspectionNotes jobId={jobId} />
  }
}
