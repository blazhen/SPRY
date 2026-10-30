import { PagedList } from '../components/Pager'
import { CheckCircle2 } from 'lucide-react'
import { RecentList } from '../components/RecentList'
import { EmptyState, MoneyText, PageHead, Section, StageBadge, StallBadge, StatTile, toast } from '../components/ui'
import { expiryNudges, todoSummary } from '../lib/insights'
import { jobText, word } from '../lib/format'
import { go, href } from '../lib/router'
import { createQuote, currentOwnerId, duplicateAsRevision, participantName, quotesForJob, recipientContactId, quotesForRecipient, todoQueue, useStore } from '../lib/store'
import type { Job, Quote } from '../types'
import type { ExpiryNudge } from '../lib/insights'

/** Opens the open draft for a job, or makes a new one for the main contact. */
function openOrCreateDraft(job: Job) {
  const draft = quotesForJob(job.id)
    .filter((q) => q.status === 'Draft')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  if (draft) {
    go(href.edit(draft.id))
    return
  }
  const main = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  if (!main) {
    toast(jobText('Add a contact to this %j first'))
    go(href.job(job.id))
    return
  }
  // Carry on from the latest quote (next revision), as the job page does. A fresh quote only when there is none.
  const newestFirst = (list: Quote[]) =>
    list.filter((q) => q.kind !== 'addon').sort((a, b) => b.revision - a.revision || b.createdAt.localeCompare(a.createdAt))[0]
  const latest = newestFirst(quotesForRecipient(job.id, { kind: main.kind, id: main.id })) ?? newestFirst(quotesForJob(job.id))
  const q = latest ? duplicateAsRevision(latest.id) : createQuote(job.id, { kind: main.kind, id: main.id })
  if (q) go(href.edit(q.id))
}

function customerName(job: Job): string {
  const main = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  return main ? participantName(main) : 'No contact yet'
}

/** The customer's name as a link to their contact page, when they have one. */
function CustomerLink({ job }: { job: Job }) {
  const s = useStore()
  const main = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  const contactId = main ? recipientContactId(main, s) : undefined
  const name = customerName(job)
  if (!contactId) return <>{name}</>
  return (
    <a href={href.contact(contactId)} className="cell-link">
      {name}
    </a>
  )
}

function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

/** One plain sentence for a quote that needs chasing. */
function nudgeText(n: ExpiryNudge): string {
  const who = customerName(n.job)
  const base = `${n.quote.number} for ${who}`
  if (n.kind === 'expired') return `${base} ran out ${days(Math.abs(n.daysLeft))} ago`
  if (n.kind === 'quiet') {
    return `${base}: no answer for ${days(n.daysQuiet)}`
  }
  if (n.daysLeft === 0) return `${base} runs out today`
  return `${base} runs out in ${days(n.daysLeft)}`
}

export default function Todo() {
  const s = useStore()
  const queue = todoQueue(currentOwnerId(), s)
  const sum = todoSummary(s)
  const nudges = expiryNudges(s)
  const oldest = queue[0]

  return (
    <div className="stack-lg">
      <PageHead
        title="To do"
        subtitle={jobText('Quotes waiting to be written, and quotes to follow up.')}
        action={
          <button type="button" className="btn btn-primary btn-lg" disabled={!oldest} onClick={() => oldest && openOrCreateDraft(oldest.job)}>
            Start the next quote
          </button>
        }
      />

      <section aria-label="Summary" className="grid-cards">
        <StatTile label="Waiting to be quoted" value={sum.waitingToQuote} tone={sum.waitingToQuote > 0 ? 'warn' : 'plain'} />
        <StatTile label="Sent, waiting for answer" value={sum.sentWaiting} hint={<MoneyText value={sum.sentWaitingValue} whole />} />
        <StatTile label="Won this month ($)" value={<MoneyText value={sum.wonThisMonthValue} whole />} tone="good" hint={`${sum.wonThisMonth} ${sum.wonThisMonth === 1 ? 'job' : 'jobs'} won`} />
      </section>

      <RecentList />

      <Section title="Waiting for you to quote">
        {queue.length === 0 ? (
          <EmptyState title="Nothing waiting. Nice work.">
            <p>
              <CheckCircle2 size={28} aria-hidden="true" className="mx-auto mb-2 text-green-ink" />
              New work shows up here when a {word(false, true)} is ready for a quote.
            </p>
            <p className="mt-4">
              <a href={href.jobs()} className="btn btn-quiet">
                See all {word(true, true)}
              </a>
            </p>
          </EmptyState>
        ) : (
          <PagedList items={queue} noun="jobs waiting for a quote" render={(rows) => (
          <div className="tbl-wrap">
            <table className="tbl tbl-click tbl-stack">
              <caption className="sr-only">Jobs waiting for a quote, oldest first</caption>
              <thead>
                <tr>
                  <th scope="col">{word()}</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Waiting</th>
                  <th scope="col" className="num-col">
                    Value before GST
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ job, daysWaiting }) => (
                  <tr key={job.id}>
                    <th scope="row" data-label={word()}>
                      <a href={href.job(job.id)} className="row-link">
                        {job.name}
                      </a>
                    </th>
                    <td data-label="Customer" data-nolabel>
                      <CustomerLink job={job} />
                    </td>
                    <td data-label="Waiting">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="num">{days(daysWaiting)}</span>
                        <StallBadge job={job} />
                        <StageBadge stage={job.stage} />
                      </span>
                    </td>
                    <td data-label="Value before GST" className="num-col">
                      <MoneyText value={job.value} whole />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )} />
        )}
      </Section>

      <Section title="Quotes to chase">
        {nudges.length === 0 ? (
          <EmptyState title="No quotes need chasing. Nice work." />
        ) : (
          <PagedList items={nudges} noun="quotes to chase" render={(rows) => (
          <div className="tbl-wrap">
            <table className="tbl tbl-click tbl-stack">
              <caption className="sr-only">Sent quotes that are running out or have gone quiet</caption>
              <thead>
                <tr>
                  <th scope="col">Quote</th>
                  <th scope="col">{word()}</th>
                  <th scope="col" className="num-col">
                    Value before GST
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.quote.id}>
                    <th scope="row" data-label="Quote">
                      <a href={href.edit(n.quote.id)} className="row-link">
                        {nudgeText(n)}
                      </a>
                    </th>
                    <td data-label={word()}>
                      <a href={href.job(n.job.id)} className="cell-link">
                        {n.job.name}
                      </a>
                    </td>
                    <td data-label="Value before GST" className="num-col">
                      <MoneyText value={n.job.value} whole />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )} />
        )}
      </Section>
    </div>
  )
}
