import { boxDef, settingOf, type BoxId } from '../../../lib/jobLayout'
import { AppointmentsPanel } from '../AppointmentsPanel'
import { AttachmentsPanel } from '../AttachmentsPanel'
import { HistoryFeed } from '../HistoryFeed'
import './libraryB.css'

type Settings = Record<string, string[] | string>
interface BoxProps {
  jobId: string
  settings?: Settings
}

const asList = (v: string[] | string | undefined): string[] | undefined => (Array.isArray(v) ? v : undefined)

/** One single-purpose list: the History feed, fixed to some kinds, with the box name and anchor. */
function Fixed({ jobId, box, kinds, pinnedFirst }: { jobId: string; box: BoxId; kinds: string[]; pinnedFirst?: boolean }) {
  const def = boxDef(box)
  return <HistoryFeed jobId={jobId} kinds={kinds} sectionId={def.anchor} title={def.label} hideFilter pinnedFirst={pinnedFirst} />
}

/** All the notes on this job, pinned first. */
export const NotesAllBox = ({ jobId }: BoxProps) => <Fixed jobId={jobId} box="notesAll" kinds={['note']} pinnedFirst />
export const TextsBox = ({ jobId }: BoxProps) => <Fixed jobId={jobId} box="texts" kinds={['text']} />
export const EmailsBox = ({ jobId }: BoxProps) => <Fixed jobId={jobId} box="emails" kinds={['email']} />
export const CallsBox = ({ jobId }: BoxProps) => <Fixed jobId={jobId} box="calls" kinds={['call']} />

/** Site visits. AppointmentsPanel already draws its own section and heading, so it is only given the anchor. */
export function VisitsBox({ jobId }: BoxProps) {
  return (
    <div id={boxDef('visits').anchor} className="lb-visits">
      <AppointmentsPanel jobId={jobId} />
    </div>
  )
}

/** The configurable History box: kinds (absent = all) and rows ('5', '10', '25', '50', 'all'; absent = the usual page). */
export function HistoryBox({ jobId, settings }: BoxProps) {
  const saved = asList(settingOf({ settings }, 'history', 'kinds'))
  const total = asList(boxDef('history').settings?.find((x) => x.name === 'kinds')?.default)?.length ?? 0
  // Never saved, nothing ticked or everything ticked: the plain feed with its filter. Otherwise the kinds are fixed, so no filter.
  const narrowed = !!saved && saved.length > 0 && saved.length < total
  const raw = settings?.rows
  const rows = raw === 'all' ? 'all' : typeof raw === 'string' && Number(raw) > 0 ? Number(raw) : undefined
  return <HistoryFeed jobId={jobId} kinds={narrowed ? saved : undefined} rows={rows} hideFilter={narrowed && saved.length === 1} />
}

/** The configurable Documents box: files, links or both (absent = both). Same props the page used before. */
export function DocumentsBox({ jobId, settings }: BoxProps) {
  const saved = asList(settings?.kinds)?.filter((k): k is 'file' | 'link' => k === 'file' || k === 'link')
  const kinds = saved && saved.length > 0 && saved.length < 2 ? saved : undefined
  return <AttachmentsPanel jobId={jobId} inJob kinds={kinds} />
}
