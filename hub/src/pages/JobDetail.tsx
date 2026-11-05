import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, Camera, FilePlus2, FolderOpen, LayoutGrid } from 'lucide-react'
import { CertificateHost } from '../components/photos/CertificateDialog'
import { JobMoreMenu } from '../components/photos/JobMoreMenu'
import { TakePhotosHost, openTakePhotos } from '../components/photos/TakePhotosDialog'
import { jobText } from '../lib/format'
import { WORKSPACE_MQ, go, href, quoteOnJob, useRoute } from '../lib/router'
import { createQuote, duplicateAsRevision, getJob, quotesForJob, useStore } from '../lib/store'
import { useJobParticipants } from '../lib/live'
import type { ParticipantRef } from '../types'
import { MoneyText, TabPanel, Tabs, toast } from '../components/ui'
import { WorkspaceQuote } from './Editor'
import InvoiceDetail from './InvoiceDetail'
import InvoiceEdit from './InvoiceEdit'
import { NewInvoicePage } from '../components/NewInvoiceDialog'
import { JobLeft } from '../components/job/JobLeft'
import { FocusMiddle, FocusRight } from '../components/job/FocusView'
import { setPreviewWidth } from '../lib/previewWidth'
import { LiveEditBar, type PreviewWidth } from '../components/live/LiveEditBar'
import { DragLayer } from '../components/live/useBoxDrag'
import { BOXES, boxDef, getJobLayout, setJobLayout, useJobLayout } from '../lib/jobLayout'
import { useEditingLayout } from '../lib/layoutEdit'
import { getLayoutSession, useLayoutSession } from '../lib/layoutDraft'
import { JobMiddle } from '../components/job/JobMiddle'
import { JobRight } from '../components/job/JobRight'
import { StageControl } from '../components/job/StageControl'
import { RailStrip } from '../components/job/RailStrip'
import { OPEN_SECTION } from '../components/job/Section'
import '../components/job/jobFrame.css'

/**
 * The job page: a fixed frame exactly as high as the window. Three panels (left: the job and who it is for,
 * middle: what has happened and the composer, right: quotes, people, files, money) each scroll on their own,
 * with a slim icon rail on the far right. The page itself never scrolls (see jobFrame.css).
 * Under 1024px the three panels become three tabs.
 */
type TabId = 'job' | 'history' | 'side'

const WIDE = '(min-width: 1024px)'
function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WIDE)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
}

/** The job page is a workspace (builder in the middle, preview on the right) from this width up. */
function useWorkspaceWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WORKSPACE_MQ)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(WORKSPACE_MQ).matches,
    () => false,
  )
}

/** Keyed on the job id so the tab goes back to the first one when another job opens. */
export default function JobDetail() {
  const route = useRoute()
  return <JobDetailInner key={route.name === 'job' ? route.id : 'none'} />
}

function JobDetailInner() {
  const route = useRoute()
  const s = useStore()
  const job = route.name === 'job' ? getJob(route.id, s) : undefined
  const [tab, setTab] = useState<TabId>('job')
  const tabsId = useId()
  const wide = useWide()
  const wsWide = useWorkspaceWide()
  const cfg = useJobLayout()
  const session = useLayoutSession()
  const editing = session.editing && wide
  const flagged = useEditingLayout()
  const [liveWidth, setLiveWidth] = useState<PreviewWidth>(0)
  // The rail's Edit layout button only raises the shared flag: start the live session for it.
  useEffect(() => {
    if (flagged && wide && !session.editing) session.start()
  }, [flagged, wide, session])
  // Edit layout never outlives the page it was opened on, nor a window that became too narrow for it.
  useEffect(() => {
    if (session.editing && !wide) session.cancel()
  }, [session, wide])
  useEffect(() => () => getLayoutSession().cancel(), [])
  useEffect(() => {
    setPreviewWidth(editing ? liveWidth : 0)
    return () => setPreviewWidth(0)
  }, [editing, liveWidth])
  useEffect(() => {
    if (!editing) setLiveWidth(0)
  }, [editing])
  const work = route.name === 'job' ? route.work : undefined
  // A rail item opens a focus view: the middle panel shows that box, the left panel stays (wide screens only).
  const view = route.name === 'job' && !route.work && wide ? route.view : undefined
  const middleRef = useRef<HTMLElement>(null)
  const workKey = work ? `${work.kind}:${work.id}` : ''
  // The right panel shows the live preview while building; "Show sections" brings the usual sections back.
  const [showPreview, setShowPreview] = useState(true)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => setShowPreview(true), [workKey])
  useJobParticipants(route.name === 'job' ? route.id : '')

  // Switching view moves focus to the middle panel (its label is read out), so keyboard and screen reader users land on the new content.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    middleRef.current?.focus({ preventScroll: true })
  }, [view])

  // A jump to a section (from the rail, "See in history", "Add a contact") first opens the tab that holds it on a phone.
  useEffect(() => {
    const on = (e: Event) => {
      const id = String((e as CustomEvent<string>).detail ?? '')
      // The tab is the panel that holds the box right now (Edit layout may have moved it).
      const box = BOXES.find((b) => b.anchor === id)
      const panel = box ? getJobLayout().boxes.find((b) => b.id === box.id)?.panel : undefined
      if (panel === 'middle') setTab('history')
      else if (panel === 'right') {
        setTab('side')
        setShowPreview(false)
      } else if (panel === 'left') setTab('job')
    }
    window.addEventListener(OPEN_SECTION, on)
    return () => window.removeEventListener(OPEN_SECTION, on)
  }, [])

  // Under the workspace width a workspace address falls back to the old full pages.
  useEffect(() => {
    if (!work || wsWide || !job) return
    if (work.kind === 'quote') go(href.edit(work.id), true)
    else if (work.kind === 'invoice') go(href.invoice(work.id), true)
    else if (work.kind === 'invoiceEdit') go(href.invoiceEdit(work.id), true)
    else go(href.invoiceNew(job.id), true)
  }, [work, wsWide, job])

  if (!job) {
    return (
      <div className="stack jf-missing">
        <h1 className="t-page">{jobText('%J not found')}</h1>
        <p>It may have been deleted, or the link is old.</p>
        <p>
          <a className="btn btn-primary btn-lg" href={href.jobs()}>
            {jobText('Back to %js')}
          </a>
        </p>
      </div>
    )
  }

  const parts = job.participants
  const mainRef: ParticipantRef | undefined = parts.find((p) => p.role === 'main') ?? parts[0]
  const quotes = quotesForJob(job.id, s)
  const byNewest = [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const draft = byNewest.find((q) => q.status === 'Draft' && q.kind !== 'addon')
  const sent = byNewest.find((q) => q.status === 'Sent' && q.kind !== 'addon')
  const accepted = byNewest.find((q) => q.status === 'Accepted' && q.kind !== 'addon')

  // One obvious main button, depending on where the job is.
  let main: { label: string; run: () => void; disabled?: boolean }
  if (quotes.length === 0) {
    main = {
      label: 'Write the quote',
      disabled: !mainRef,
      run: () => {
        if (!mainRef) return
        const q = createQuote(job.id, mainRef)
        if (q) go(quoteOnJob(job.id, q.id))
      },
    }
  } else if (draft ?? sent ?? accepted) {
    const q = (draft ?? sent ?? accepted)!
    main = { label: 'Open the quote', run: () => go(quoteOnJob(job.id, q.id)) }
  } else {
    const q = byNewest[0]
    main = {
      label: 'Start from last quote',
      run: () => {
        const n = duplicateAsRevision(q.id)
        if (n) go(quoteOnJob(job.id, n.id))
        else toast('The new quote could not be made.')
      },
    }
  }

  const tabs = [
    { id: 'job', label: 'Job' },
    { id: 'history', label: 'History' },
    { id: 'side', label: 'Quotes and files' },
  ]

  const head = (
    <>
      <div className="jf-head">
        <a className="jf-back" href={href.jobs()}>
          <ArrowLeft size={18} aria-hidden="true" />
          {jobText('Back to %js')}
        </a>
        <div className="jf-head-row">
          <div className="jf-title">
            <h1 className="jf-h1 break-words">{job.name}</h1>
            <div className="jf-badges">
              <StageControl jobId={job.id} />
              <span className="jf-value">
                <MoneyText value={job.value} whole /> <span className="jf-value-note">before GST</span>
              </span>
            </div>
          </div>
          <div className="jf-actions">
            <button type="button" className="btn btn-good jf-main ph-head-btn" data-take-photos-head onClick={() => openTakePhotos(job.id)}>
              <Camera size={20} aria-hidden="true" />
              Take photos
            </button>
            <JobMoreMenu jobId={job.id} />
            {wide && (
              <button type="button" className="btn btn-neutral btn-icon" data-edit-layout aria-label="Edit layout" title="Edit layout" onClick={() => session.start()}>
                <LayoutGrid size={18} aria-hidden="true" />
              </button>
            )}
            <button type="button" className="btn btn-primary jf-main" onClick={main.run} disabled={main.disabled}>
              {main.label === 'Write the quote' ? <FilePlus2 size={20} aria-hidden="true" /> : <FolderOpen size={20} aria-hidden="true" />}
              {main.label}
            </button>
          </div>
        </div>
        {job.status === 'lost' && job.lostReason && <p className="jf-stage-help">{`Lost: ${job.lostReason}.`}</p>}
      </div>
    </>
  )

  const hasPreview = !!work && work.kind !== 'invoiceNew'
  const wsOn = !!work && wsWide && !editing
  const swapped = wsOn && cfg.swap && hasPreview
  const flipSides = () => setJobLayout({ ...cfg, swap: !cfg.swap })
  // The builder (a quote or an invoice) and its live preview: normally builder in the middle, preview on the right.
  const builder = work ? <WorkMiddle work={work} jobId={job.id} slot={hasPreview && (swapped || showPreview) ? slot : null} /> : null
  const previewSide = work ? (
    <>
      {hasPreview && (
        <div className="ws-rightbar no-print">
          <span className="ws-rightbar-title">{showPreview || swapped ? 'Live preview' : 'Job details'}</span>
          <span className="ws-rightbar-btns">
            <button type="button" className="btn btn-neutral btn-sm" onClick={flipSides} data-ws-swap>
              Swap sides
            </button>
            {!swapped && (
              <button type="button" className="btn btn-neutral btn-sm" onClick={() => setShowPreview((v) => !v)} data-ws-toggle>
                {showPreview ? 'Show sections' : 'Show preview'}
              </button>
            )}
          </span>
        </div>
      )}
      {hasPreview && (showPreview || swapped) ? <div ref={setSlot} className="ws-preview" data-ws-preview /> : <JobRight jobId={job.id} railed />}
    </>
  ) : null

  return (
    <div className="jf" data-job-frame>
      <TakePhotosHost jobId={job.id} />
      <CertificateHost jobId={job.id} />
      {editing && (
        <>
          <LiveEditBar width={liveWidth} onWidth={setLiveWidth} />
          <DragLayer />
        </>
      )}
      {wide ? (
        <div className="jf-pv" data-live-preview={editing && liveWidth ? liveWidth : undefined} style={editing && liveWidth ? { width: `min(${liveWidth}px, 100%)` } : undefined}>
        {head}
        {/* While Edit layout is on the quote or invoice builder steps aside so every box shows with its edit frame. */}
        <div
          className="jf-body"
          data-editing={editing ? '' : undefined}
          data-work={work && wsWide && !editing ? work.kind : undefined}
          data-swap={work && wsWide && !editing && cfg.swap ? '' : undefined}
          data-rail-side={cfg.rail.show ? cfg.rail.side : 'none'}
          data-rail-names={cfg.rail.show && cfg.rail.names ? '' : undefined}
          onClickCapture={(e) => {
            // Any rail button in the workspace brings the sections back in place of the preview.
            if (work && !cfg.swap && (e.target as HTMLElement).closest('.jf-rail-btn[data-rail]')) setShowPreview(false)
          }}
          onKeyDown={(e) => {
            // Escape leaves a focus view for All (a dialog, menu, popover or text field handles its own Escape first).
            if (e.key === 'Escape' && view && !e.defaultPrevented && !(e.target as HTMLElement).closest('dialog, .menu-pop, .pane-pop, .le-pop, input, textarea, select, [role="dialog"]')) go(href.job(job.id))
          }}
        >
          {cfg.rail.show && cfg.rail.side === 'left' && <RailStrip />}
          <section className="jf-panel" data-panel="left" tabIndex={0} aria-label="The job and who it is for">
            <JobLeft jobId={job.id} />
          </section>
          <section ref={middleRef} className="jf-panel" data-panel="middle" data-focus-view={view} tabIndex={0} aria-label={view ? `${boxDef(view).label}: focus view. Press Escape or Back to all to return.` : wsOn ? (cfg.swap ? 'Live preview' : 'Quote or invoice builder') : 'History and new notes, texts, emails and tasks'}>
            {wsOn ? (swapped ? previewSide : builder) : view && !editing ? <FocusMiddle view={view} jobId={job.id} /> : <JobMiddle jobId={job.id} />}
          </section>
          <section className="jf-panel" data-panel="right" tabIndex={0} aria-label={wsOn ? (swapped ? 'Quote or invoice builder' : showPreview && hasPreview ? 'Live preview' : 'Quotes, people, files and money') : 'Quotes, people, files and money'}>
            {wsOn ? (swapped ? builder : previewSide) : view && !editing ? <FocusRight view={view} jobId={job.id} /> : <JobRight jobId={job.id} railed />}
          </section>
          {cfg.rail.show && cfg.rail.side === 'right' && <RailStrip />}
        </div>
        </div>
      ) : (
        /* Phone and tablet: the head scrolls away with the content and the tabs stay at the top, so the panel gets the whole screen.
           All three panels stay mounted (only the open one is shown) so a half-typed note survives a tab change. */
        <div className="jf-scroll">
          {head}
          <div className="jf-tabs-sticky">
            <Tabs tabs={tabs} value={tab} onChange={(id) => setTab(id as TabId)} label="About this job" tabsId={tabsId} />
          </div>
          <TabPanel tabsId={tabsId} id={tab} className="jf-panel jf-panel-tab">
            <div data-panel="left" hidden={tab !== 'job'}>
              <JobLeft jobId={job.id} />
            </div>
            <div data-panel="middle" hidden={tab !== 'history'}>
              <JobMiddle jobId={job.id} />
            </div>
            <div data-panel="right" hidden={tab !== 'side'}>
              <JobRight jobId={job.id} railed={false} />
            </div>
          </TabPanel>
        </div>
      )}
    </div>
  )
}

/** The middle panel in workspace mode. */
function WorkMiddle({ work, jobId, slot }: { work: NonNullable<Extract<ReturnType<typeof useRoute>, { name: 'job' }>['work']>; jobId: string; slot: HTMLElement | null }) {
  if (work.kind === 'quote') return <WorkspaceQuote key={work.id} quoteId={work.id} slot={slot} />
  if (work.kind === 'invoice') return <InvoiceDetail key={`v-${work.id}`} ws={{ id: work.id, jobId, slot }} />
  if (work.kind === 'invoiceEdit') return <InvoiceEdit key={`e-${work.id}`} ws={{ id: work.id, jobId, slot }} />
  return (
    <div className="qi-ws" data-invoice-new>
      <a href={href.job(jobId)} className="btn btn-ghost -ml-3" data-back-to="activity">
        Back to activity
      </a>
      <NewInvoicePage jobId={jobId} />
    </div>
  )
}
