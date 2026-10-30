import { DATA_SOURCE } from '../config'
import { useSync, type SyncStatus as Status } from '../lib/sync'
import { useWriteError } from '../lib/writeError'

const LABEL: Record<Status, string> = {
  saved: 'Saved',
  saving: 'Saving...',
  offline: 'Offline, retrying',
  conflict: 'Conflict: reloaded',
  stopped: '',
}

/** Small save indicator for the top bar. Live mode only; nothing is shown in mock mode. */
export function SyncStatus() {
  const { ready, status } = useSync()
  const failed = useWriteError()
  if (DATA_SOURCE !== 'live' || !ready || status === 'stopped') return null
  if (failed) {
    return (
      <p role="status" aria-live="polite" data-sync="error" className="m-0 whitespace-nowrap text-sm font-bold text-ink">
        Not saved
      </p>
    )
  }
  const warn = status === 'offline' || status === 'conflict'
  return (
    <p role="status" aria-live="polite" data-sync={status} className={`m-0 whitespace-nowrap text-sm ${warn ? 'font-bold text-ink' : 'text-muted'}`}>
      {LABEL[status]}
    </p>
  )
}
