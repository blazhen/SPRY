import { isCalendarSetupProblem, refreshCalendar } from '../../lib/calendar'
import { href } from '../../lib/router'

/** Why the calendar could not be read, in the server's own words, with Try again and (for a set-up problem) a link to Settings. */
export function CalendarError({ error }: { error: string }) {
  if (!error) return null
  return (
    <div className="stack" role="alert">
      <p className="err">{error}. The list may be out of date.</p>
      <p>
        <button type="button" className="btn btn-neutral btn-sm" onClick={() => void refreshCalendar()}>
          Try again
        </button>{' '}
        {isCalendarSetupProblem(error) && (
          <a className="cell-link" href={href.settings()}>
            Open Settings
          </a>
        )}
      </p>
    </div>
  )
}
