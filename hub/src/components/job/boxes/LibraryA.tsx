import { useState } from 'react'
import { FolderOpen, Mail, MessageSquare, Phone, Plus } from 'lucide-react'
import { AddressActions } from '../../FollowUpBar'
import { NewInvoiceDialog } from '../../NewInvoiceDialog'
import QuoteSheet from '../../QuoteSheet'
import { StageBadge } from '../../ui'
import { boxDef, type BoxId } from '../../../lib/jobLayout'
import { go, quoteOnJob } from '../../../lib/router'
import { STAGE_HELP, createQuote, getContact, getJob, quotesForJob, recipientContactId, useStore } from '../../../lib/store'
import { Composer } from '../Composer'
import { JobStatusControls } from '../JobStatusControls'
import { MoveToStage } from '../MoveToStage'
import { OPEN_SECTION, Section } from '../Section'
import './libraryA.css'

type BoxProps = { jobId: string; settings?: Record<string, string[] | string> }

const anchorOf = (id: BoxId) => boxDef(id).anchor
const labelOf = (id: BoxId) => boxDef(id).label

/** Add a note: the composer with the Note mode only. */
export function AddNoteBox({ jobId }: BoxProps) {
  return <Composer jobId={jobId} modes={['note']} sectionId={anchorOf('addNote')} title={labelOf('addNote')} />
}
/** Add a text: the composer with the Text mode only. */
export function AddTextBox({ jobId }: BoxProps) {
  return <Composer jobId={jobId} modes={['text']} sectionId={anchorOf('addText')} title={labelOf('addText')} />
}
/** Add an email: the composer with the Email mode only. */
export function AddEmailBox({ jobId }: BoxProps) {
  return <Composer jobId={jobId} modes={['email']} sectionId={anchorOf('addEmail')} title={labelOf('addEmail')} />
}
/** Add a task: the composer with the Task mode only. */
export function AddTaskBox({ jobId }: BoxProps) {
  return <Composer jobId={jobId} modes={['task']} sectionId={anchorOf('addTask')} title={labelOf('addTask')} />
}

/** If a composer box is on the page, open it and put the cursor in it. Returns false when it is not on the page. */
function openComposer(anchor: string | undefined): boolean {
  if (!anchor) return false
  const el = document.getElementById(anchor)
  if (!el) return false
  window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: anchor }))
  window.setTimeout(() => {
    document.getElementById(anchor)?.scrollIntoView({ block: 'nearest' })
  }, 0)
  return true
}

/** The buttons used most, as one wrapping row. */
export function QuickActionsBox({ jobId }: BoxProps) {
  const s = useStore()
  const job = getJob(jobId, s)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const id = 'quickActions' as const

  let content: React.ReactNode
  if (!job) {
    content = <p className="t-small text-muted">This job could not be found.</p>
  } else {
    const mainRef = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
    const cid = mainRef ? recipientContactId(mainRef, s) : undefined
    const contact = cid ? getContact(cid, s) : undefined
    const phone = (contact?.mobile || contact?.phone || '').trim()
    const email = (contact?.email || '').trim()
    const quotes = quotesForJob(job.id, s)
    const byNewest = [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const open = byNewest.find((q) => q.status === 'Draft' && q.kind !== 'addon') ?? byNewest.find((q) => q.status === 'Sent' && q.kind !== 'addon') ?? byNewest.find((q) => q.status === 'Accepted' && q.kind !== 'addon') ?? byNewest[0]

    const writeQuote = () => {
      if (open) return go(quoteOnJob(job.id, open.id))
      if (!mainRef) return
      const q = createQuote(job.id, mainRef)
      if (q) go(quoteOnJob(job.id, q.id))
    }
    const sms = () => {
      if (openComposer(boxDef('addText').anchor)) return
      if (phone) window.location.href = `sms:${phone}`
    }
    const mail = () => {
      if (openComposer(boxDef('addEmail').anchor)) return
      if (email) window.location.href = `mailto:${email}`
    }

    content = (
      <>
        <div className="la-row" role="group" aria-label="Quick actions">
          {phone ? (
            <a className="btn btn-neutral la-btn" href={`tel:${phone}`}>
              <Phone size={16} aria-hidden="true" />
              Call
            </a>
          ) : (
            <button type="button" className="btn btn-neutral la-btn" disabled title="No phone number on file">
              <Phone size={16} aria-hidden="true" />
              Call
            </button>
          )}
          <button type="button" className="btn btn-neutral la-btn" onClick={sms}>
            <MessageSquare size={16} aria-hidden="true" />
            Text
          </button>
          <button type="button" className="btn btn-neutral la-btn" onClick={mail}>
            <Mail size={16} aria-hidden="true" />
            Email
          </button>
          <button type="button" className={`btn ${open ? 'btn-good' : 'btn-add'} la-btn`} onClick={writeQuote} disabled={!open && !mainRef}>
            {open ? <FolderOpen size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {open ? 'Open the quote' : 'Write the quote'}
          </button>
          <button type="button" className="btn btn-add la-btn" onClick={() => setInvoiceOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            New invoice
          </button>
        </div>
        {!phone && <p className="t-small text-muted">No phone number on file for the customer.</p>}
        <NewInvoiceDialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} jobId={job.id} />
      </>
    )
  }

  return (
    <Section id={anchorOf(id)} title={labelOf(id)}>
      <div className="la-body">{content}</div>
    </Section>
  )
}

/** Where the job is up to, what that means, and the Move to and status buttons. */
export function StageBox({ jobId }: BoxProps) {
  const s = useStore()
  const job = getJob(jobId, s)
  const id = 'stage' as const
  return (
    <Section id={anchorOf(id)} title={labelOf(id)}>
      {job ? (
        <div className="la-body">
          <div className="la-row">
            <StageBadge stage={job.stage} />
          </div>
          <p className="t-small">
            {STAGE_HELP[job.stage]}
            {job.status === 'lost' && job.lostReason ? ` Lost: ${job.lostReason}.` : ''}
          </p>
          <div className="la-row">
            <MoveToStage jobId={job.id} />
            <JobStatusControls jobId={job.id} />
          </div>
        </div>
      ) : (
        <p className="t-small text-muted la-body">This job could not be found.</p>
      )}
    </Section>
  )
}

/** The site address as text with Copy and Open in maps. Nothing is loaded from the network. */
export function MapBox({ jobId }: BoxProps) {
  const s = useStore()
  const job = getJob(jobId, s)
  const id = 'map' as const
  const address = (job?.address ?? '').trim()
  return (
    <Section id={anchorOf(id)} title={labelOf(id)}>
      <div className="la-body">
        {address ? (
          <>
            <p className="la-address">{address}</p>
            <div className="la-row">
              <AddressActions address={address} />
            </div>
          </>
        ) : (
          <p className="t-small text-muted">No site address yet.</p>
        )}
      </div>
    </Section>
  )
}

/** What the latest live quote looks like to the customer. */
export function QuotePreviewBox({ jobId }: BoxProps) {
  const s = useStore()
  const job = getJob(jobId, s)
  const id = 'quotePreview' as const
  const latest = job
    ? quotesForJob(job.id, s)
        .filter((q) => q.status !== 'Superseded' && q.kind !== 'addon')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : undefined
  return (
    <Section
      id={anchorOf(id)}
      title={labelOf(id)}
      summary={latest?.number}
      action={
        job && latest ? (
          <a className="btn btn-good btn-sm" href={quoteOnJob(job.id, latest.id)}>
            Open the quote
          </a>
        ) : undefined
      }
    >
      {job && latest ? (
        <div className="la-preview">
          <p className="t-small text-muted">Quote {latest.number}</p>
          <QuoteSheet quote={latest} job={job} mode="staff" />
        </div>
      ) : (
        <p className="t-small text-muted la-body">No quote yet.</p>
      )}
    </Section>
  )
}
