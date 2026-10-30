import { STAGE_ROLE } from '../config'
import { addDaysISO, setStages, stageList, stall, stallLimitFor, todayISO } from './format'
import {
  acceptQuote, createQuote, declineQuote, eventsForJob, fixSettings, getJob, getState, listJobs, markJobLost, markJobWon, reopenJob, resetDemoData, resetStallLimits, sendQuote, setJobStage, setStallLimit, todoQueue, updateJob,
} from './store'
import { STAGES } from '../types'
import type { Stage } from '../types'

/**
 * Self-check for the stage roles and the open / won / lost status, against the demo seed.
 * It CHANGES the saved demo data (it calls resetDemoData first and last), so run it from a script
 * (scripts/check-stages.mjs) or the console, never inside a screen.
 */
export function stageSelfCheck(): { ok: boolean; failures: string[] } {
  const failures: string[] = []
  const eq = (name: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`)
  }
  const stage = (id: string) => getJob(id)?.stage
  const status = (id: string) => getJob(id)?.status
  const ids = () => todoQueue().map((x) => x.job.id)
  const draftFor = (jobId: string, contactId: string) => {
    const q = createQuote(jobId, { kind: 'contact', id: contactId })
    return q?.id ?? ''
  }

  resetDemoData()
  eq('stage list is the 14 CRM stages', stageList(), [...STAGES])
  eq('roles resolve', [STAGE_ROLE.queue, STAGE_ROLE.sent, STAGE_ROLE.accepted], ['Quoting', 'Quote Sent', 'Quote Accepted'])

  // Queue: only open Quoting jobs of the owner.
  eq('queue lists open Quoting jobs for Glenn', ids().sort(), ['j1', 'j2', 'j3'])
  markJobLost('j2', 'Chose another contractor')
  eq('mark lost leaves the stage', stage('j2'), 'Quoting')
  eq('mark lost sets the status', status('j2'), 'lost')
  eq('mark lost keeps the reason', getJob('j2')?.lostReason, 'Chose another contractor')
  eq('queue skips a lost job', ids().sort(), ['j1', 'j3'])
  markJobWon('j3')
  eq('queue skips a won job', ids(), ['j1'])
  eq('won job stage stays', stage('j3'), 'Quoting')
  eq('closed jobs are never stalled', stall(getJob('j2')!).level, 'ok')
  reopenJob('j2')
  eq('reopen sets open', status('j2'), 'open')
  eq('reopen clears the reason', getJob('j2')?.lostReason, undefined)
  eq('queue has the reopened job again', ids().sort(), ['j1', 'j2'])
  eq('status filter lost', listJobs({ status: 'lost' }).map((j) => j.id), ['j10'])
  eq('status filter won', listJobs({ status: 'won' }).map((j) => j.id).sort(), ['j11', 'j12', 'j3', 'j6', 'j9'])

  // Send: Quoting -> Quote Sent.
  eq('j1 starts in Quoting', stage('j1'), 'Quoting')
  sendQuote('q2')
  eq('send moves Quoting to Quote Sent', stage('j1'), 'Quote Sent')

  // Send never moves backwards: Job Booked and Follow-Up stay.
  eq('j6 starts at Job Booked', stage('j6'), 'Job Booked')
  const since6 = getJob('j6')?.stageSince
  const q6 = draftFor('j6', 'c2')
  sendQuote(q6)
  eq('send on Job Booked keeps Job Booked', stage('j6'), 'Job Booked')
  eq('send on Job Booked keeps stageSince', getJob('j6')?.stageSince, since6)
  setJobStage('j8', 'Follow-Up')
  sendQuote(draftFor('j8', 'c8'))
  eq('send on Follow-Up keeps Follow-Up', stage('j8'), 'Follow-Up')

  // Accept: Quote Sent -> Quote Accepted, later stages kept, decline leaves the stage.
  eq('j5 starts at Quote Sent', stage('j5'), 'Quote Sent')
  acceptQuote('q6', 'phone')
  eq('accept moves Quote Sent to Quote Accepted', stage('j5'), 'Quote Accepted')
  acceptQuote(q6, 'phone')
  eq('accept on Job Booked keeps Job Booked', stage('j6'), 'Job Booked')
  eq('accept sets won', status('j5'), 'won')
  eq('accept logs one Marked won event', eventsForJob('j5').filter((e) => e.text === 'Marked won').length, 1)
  // Add-on acceptance leaves the status alone.
  reopenJob('j6')
  const addon = createQuote('j6', { kind: 'contact', id: 'c2' }, { kind: 'addon' })?.id ?? ''
  sendQuote(addon)
  acceptQuote(addon, 'phone')
  eq('add-on accept does not change status', status('j6'), 'open')
  eq('add-on accept keeps stage', stage('j6'), 'Job Booked')
  // A lost job whose quote is later accepted becomes won.
  markJobLost('j8', 'gone quiet')
  const q8b = draftFor('j8', 'c8')
  sendQuote(q8b)
  acceptQuote(q8b, 'phone')
  eq('lost then accepted becomes won', status('j8'), 'won')
  eq('lost then accepted moves to Quote Accepted', stage('j8'), 'Quote Accepted')
  // Decline and expiry never set lost.
  eq('j9 is won before decline', status('j9'), 'won')
  const qd = draftFor('j9', 'c9')
  sendQuote(qd)
  declineQuote(qd, 'no')
  eq('decline leaves the stage', stage('j9'), 'Job Completed')
  eq('decline never sets lost', status('j9'), 'won')
  eq('send never sets lost or won (j7 open)', status('j7'), 'open')

  // A role missing from the CRM list switches that automation off.
  resetDemoData()
  setStages(['New Lead', 'Dial 1', 'Quote Sent', 'Quote Accepted', 'Job Booked'])
  eq('no Quoting stage: queue is empty', ids(), [])
  updateJob('j1', { stage: 'Dial 1' })
  sendQuote('q2')
  eq('sent role still works with a shorter list', stage('j1'), 'Quote Sent')
  setStages(['New Lead', 'Dial 1', 'Quoting', 'Job Booked'])
  updateJob('j7', { stage: 'Dial 1' })
  sendQuote(draftFor('j7', 'c7'))
  eq('no sent role: send leaves the stage', stage('j7'), 'Dial 1')
  setStages([...STAGES])
  resetDemoData()

  // Stall limits (Settings page).
  const old = { id: 'x', stage: 'Quoting' as Stage, stageSince: addDaysISO(todayISO(), -5) }
  const lvl = () => stall(old).level
  eq('default Quoting limit', stallLimitFor('Quoting'), { slow: 3, stuck: 7 })
  eq('default Nurture is never flagged', stallLimitFor('Nurture'), null)
  eq('default level at 5 days', lvl(), 'slow')
  eq('override: Quoting 1 and 2 is stuck at 5 days', setStallLimit('Quoting', { slow: 1, stuck: 2 }), { ok: true })
  eq('override is read back', stallLimitFor('Quoting', getState()), { slow: 1, stuck: 2 })
  eq('override changes the level', lvl(), 'stuck')
  eq('other stages keep their default', stallLimitFor('Dial 1'), { slow: 2, stuck: 4 })
  setStallLimit('Quoting', { slow: null, stuck: null })
  eq('null means never flagged', stallLimitFor('Quoting'), null)
  eq('null level is ok', lvl(), 'ok')
  setStallLimit('Quoting', { slow: 1, stuck: 2 })
  eq('stuck equal to slow is rejected', setStallLimit('Quoting', { slow: 3, stuck: 3 }).ok, false)
  eq('stuck below slow is rejected', setStallLimit('Quoting', { slow: 5, stuck: 2 }).ok, false)
  eq('0 is rejected', setStallLimit('Quoting', { slow: 0, stuck: 5 }).ok, false)
  eq('366 is rejected', setStallLimit('Quoting', { slow: 5, stuck: 366 }).ok, false)
  eq('365 is accepted', setStallLimit('Quoting', { slow: 5, stuck: 365 }).ok, true)
  eq('a decimal is rejected', setStallLimit('Quoting', { slow: 2.5, stuck: 7 }).ok, false)
  eq('one null alone is rejected', setStallLimit('Quoting', { slow: 2, stuck: null }).ok, false)
  setStallLimit('Quoting', { slow: 1, stuck: 2 })
  eq('a rejected save keeps the last good value', stallLimitFor('Quoting'), { slow: 1, stuck: 2 })
  resetStallLimits()
  eq('reset restores the default', stallLimitFor('Quoting', getState()), { slow: 3, stuck: 7 })
  eq('reset clears the saved record', getState().settings.stallLimits, undefined)
  eq('reset restores the level', lvl(), 'slow')
  eq('an old settings record loads', fixSettings({ jobWord: 'Project' }), { jobWord: 'Project' })
  eq('junk settings load as defaults', fixSettings('nope'), { jobWord: 'Job' })
  eq('bad saved limits are dropped', fixSettings({ jobWord: 'Job', stallLimits: { Quoting: { slow: 9, stuck: 2 }, 'Dial 1': { slow: 1, stuck: 3 } } }), { jobWord: 'Job', stallLimits: { 'Dial 1': { slow: 1, stuck: 3 } } })
  resetDemoData()

  return { ok: failures.length === 0, failures }
}
