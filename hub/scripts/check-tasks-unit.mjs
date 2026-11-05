// Unit tests for the task time rules in src/lib/tasks.ts. No browser, no server. Run: node scripts/check-tasks-unit.mjs
import { build } from 'esbuild'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hub-tasks-')), 'bundle.mjs')
await build({ entryPoints: [path.join(ROOT, 'src/lib/tasks.ts')], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' })
const X = await import(pathToFileURL(out).href)

let failed = 0
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' :: got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)}`)
}
const task = (over = {}) => ({ id: 't', title: 'Call', done: false, ...over })
// Melbourne wall clock to a Date. Winter is +10:00, summer (daylight saving) +11:00.
const at = (iso) => new Date(iso)

// ---- Overdue and due today with a time (Melbourne, 5 Nov 2026 is daylight saving, +11:00) ----
const nine = task({ dueDate: '2026-11-05', dueTime: '09:00' })
eq('9 am task at 8:59 is not overdue', X.isTaskOverdue(nine, at('2026-11-04T21:59:00Z')), false)
eq('9 am task at exactly 9:00 is not overdue', X.isTaskOverdue(nine, at('2026-11-04T22:00:00Z')), false)
eq('9 am task at 9:01 is overdue', X.isTaskOverdue(nine, at('2026-11-04T22:01:00Z')), true)
eq('9 am task at 10:00 is overdue', X.isTaskOverdue(nine, at('2026-11-04T23:00:00Z')), true)
eq('9 am task is due today at 10:00', X.isTaskDueToday(nine, at('2026-11-04T23:00:00Z')), true)
eq('9 am task is not due today the day before (23:59)', X.isTaskDueToday(nine, at('2026-11-04T12:59:00Z')), false)
eq('a done task is never overdue', X.isTaskOverdue({ ...nine, done: true }, at('2026-11-06T00:00:00Z')), false)

// ---- All day ----
const allDay = task({ dueDate: '2026-11-05' })
eq('all day task is not overdue at 23:59 on its day', X.isTaskOverdue(allDay, at('2026-11-05T12:59:00Z')), false)
eq('all day task is overdue the day after (00:00)', X.isTaskOverdue(allDay, at('2026-11-05T13:00:00Z')), true)
eq('all day task due today on its day', X.isTaskDueToday(allDay, at('2026-11-05T01:00:00Z')), true)
eq('all day task yesterday is overdue now', X.isTaskOverdue(task({ dueDate: '2026-11-04' }), at('2026-11-05T01:00:00Z')), true)
eq('all day task yesterday is not due today', X.isTaskDueToday(task({ dueDate: '2026-11-04' }), at('2026-11-05T01:00:00Z')), false)
eq('empty dueTime means all day', X.isTaskOverdue(task({ dueDate: '2026-11-05', dueTime: '' }), at('2026-11-05T12:59:00Z')), false)
eq('all day end of day moment (Melbourne +11)', X.taskDueAt(allDay).toISOString(), '2026-11-05T12:59:59.999Z')
eq('9 am moment (Melbourne +11)', X.taskDueAt(nine).toISOString(), '2026-11-04T22:00:00.000Z')
// Local day, not the UTC day: 00:30 Melbourne on 5 Nov is still 4 Nov in UTC.
eq('due today uses the Melbourne day, not the UTC day', X.isTaskDueToday(allDay, at('2026-11-04T13:30:00Z')), true)

// ---- Daylight saving: the day never shifts ----
// 2026-04-05 03:00 AEDT (+11) goes back to 02:00 AEST (+10). 2026-10-04 02:00 AEST (+10) goes forward to 03:00 AEDT (+11).
eq('5 Apr 2026 09:00 is +10 (after the end of DST)', X.taskDueAt(task({ dueDate: '2026-04-05', dueTime: '09:00' })).toISOString(), '2026-04-04T23:00:00.000Z')
eq('4 Apr 2026 09:00 is +11 (still DST)', X.taskDueAt(task({ dueDate: '2026-04-04', dueTime: '09:00' })).toISOString(), '2026-04-03T22:00:00.000Z')
eq('5 Apr 2026 all day ends at 23:59:59.999 +10', X.taskDueAt(task({ dueDate: '2026-04-05' })).toISOString(), '2026-04-05T13:59:59.999Z')
eq('4 Apr 2026 all day ends at 23:59:59.999 +11', X.taskDueAt(task({ dueDate: '2026-04-04' })).toISOString(), '2026-04-04T12:59:59.999Z')
eq('4 Oct 2026 09:00 is +11 (DST started)', X.taskDueAt(task({ dueDate: '2026-10-04', dueTime: '09:00' })).toISOString(), '2026-10-03T22:00:00.000Z')
eq('3 Oct 2026 09:00 is +10 (before DST)', X.taskDueAt(task({ dueDate: '2026-10-03', dueTime: '09:00' })).toISOString(), '2026-10-02T23:00:00.000Z')
eq('4 Oct 2026 all day ends at 23:59:59.999 +11', X.taskDueAt(task({ dueDate: '2026-10-04' })).toISOString(), '2026-10-04T12:59:59.999Z')
eq('3 Oct 2026 all day ends at 23:59:59.999 +10', X.taskDueAt(task({ dueDate: '2026-10-03' })).toISOString(), '2026-10-03T13:59:59.999Z')
eq('4 Oct 2026 all day task not overdue at 23:59 local', X.isTaskOverdue(task({ dueDate: '2026-10-04' }), at('2026-10-04T12:59:00Z')), false)
eq('4 Oct 2026 all day task overdue at 00:00 on the 5th', X.isTaskOverdue(task({ dueDate: '2026-10-04' }), at('2026-10-04T13:00:00Z')), true)
eq('5 Apr 2026 all day task due today at 23:30 local (+10)', X.isTaskDueToday(task({ dueDate: '2026-04-05' }), at('2026-04-05T13:30:00Z')), true)
eq('hubDay across the April change', [X.hubDay(at('2026-04-04T12:59:00Z')), X.hubDay(at('2026-04-04T13:00:00Z'))], ['2026-04-04', '2026-04-05'])
eq('hubDay at the April +10 midnight', X.hubDay(at('2026-04-05T14:00:00Z')), '2026-04-06')
// 2:30 am on 5 Apr happens twice; either moment is fine, but it must stay on the 5th.
eq('2:30 am on the repeated hour stays on 5 Apr', X.hubDay(X.taskDueAt(task({ dueDate: '2026-04-05', dueTime: '02:30' }))), '2026-04-05')
// 2:30 am on 4 Oct does not exist; it must still land on the 4th.
eq('2:30 am on the skipped hour stays on 4 Oct', X.hubDay(X.taskDueAt(task({ dueDate: '2026-10-04', dueTime: '02:30' }))), '2026-10-04')

// ---- Labels ----
eq('label with time (afternoon)', X.taskDueLabel(task({ dueDate: '2026-11-05', dueTime: '14:30' })), 'Thu 5 Nov, 2:30 pm')
eq('label all day', X.taskDueLabel(task({ dueDate: '2026-11-05' })), 'Thu 5 Nov')
eq('label morning', X.taskDueLabel(task({ dueDate: '2026-11-05', dueTime: '09:05' })), 'Thu 5 Nov, 9:05 am')
eq('label midnight and noon', [X.taskDueLabel(task({ dueDate: '2026-11-05', dueTime: '00:00' })), X.taskDueLabel(task({ dueDate: '2026-11-05', dueTime: '12:00' }))], ['Thu 5 Nov, 12:00 am', 'Thu 5 Nov, 12:00 pm'])
eq('label no date', X.taskDueLabel(task()), '')
eq('label of a full ISO date-time keeps the day', X.taskDueLabel(task({ dueDate: '2026-11-05T00:00:00.000Z' })), 'Thu 5 Nov')

// ---- Order ----
const list = [
  task({ title: 'No date' }),
  task({ title: 'B', dueDate: '2026-11-06', dueTime: '08:00' }),
  task({ title: 'Z all day', dueDate: '2026-11-05' }),
  task({ title: 'A late', dueDate: '2026-11-05', dueTime: '16:00' }),
  task({ title: 'A early', dueDate: '2026-11-05', dueTime: '08:00' }),
  task({ title: 'A all day', dueDate: '2026-11-05' }),
]
eq('order: date, then time (all day first), then title, no date last', list.sort(X.compareTasks).map((t) => t.title), ['A all day', 'Z all day', 'A early', 'A late', 'B', 'No date'])

// ---- Old tasks: only a title and a date ----
const old = { id: 'o', title: 'Old task', dueDate: '2026-11-05', done: false }
eq('old task: title', X.taskTitle(old), 'Old task')
eq('old task is all day: label', X.taskDueLabel(old), 'Thu 5 Nov')
eq('old task: overdue next day', X.isTaskOverdue(old, at('2026-11-05T13:00:00Z')), true)
eq('task with no date is never overdue or due today', [X.isTaskOverdue(task()), X.isTaskDueToday(task()), X.taskDueAt(task())], [false, false, null])
eq('bad time is treated as all day', X.taskDueAt(task({ dueDate: '2026-11-05', dueTime: '25:99' })).toISOString(), '2026-11-05T12:59:59.999Z')

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
