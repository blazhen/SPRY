import { Printer } from 'lucide-react'
import { PagedList } from '../components/Pager'
import { EmptyState, MoneyText, PageHead, Section, StageBadge, StallBadge, StatTile } from '../components/ui'
import { fmtDate, word } from '../lib/format'
import { weeklySummary, type ExpiryNudge } from '../lib/insights'
import { href } from '../lib/router'
import { getJob, participantName, useStore } from '../lib/store'
import type { Job } from '../types'

function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

function customerName(job: Job): string {
  const main = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  return main ? participantName(main) : 'No contact yet'
}

/** Plain words for why a quote is on the list. */
function nudgeLabel(n: ExpiryNudge): string {
  if (n.kind === 'expired') return `Ran out ${days(Math.abs(n.daysLeft))} ago`
  if (n.kind === 'quiet') return `No answer for ${days(n.daysQuiet)}`
  return n.daysLeft === 0 ? 'Runs out today' : `Runs out in ${days(n.daysLeft)}`
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

export default function Week() {
  const s = useStore()
  const w = weeklySummary(s)
  const jobWord = word(true, true)
  const runningOut = w.expiring

  return (
    <div className="stack-lg week-page">
      <PageHead
        title="This week"
        subtitle={`${fmtDate(w.from)} to ${fmtDate(w.to)}`}
        action={
          <button type="button" className="btn btn-primary btn-lg no-print" onClick={() => window.print()}>
            <Printer size={20} aria-hidden="true" />
            Print this page
          </button>
        }
      />

      <div className="card stack">
        <p className="t-section">
          In the last 7 days you sent {w.quotesSent} {plural(w.quotesSent, 'quote', 'quotes')} and {w.quotesAccepted} {plural(w.quotesAccepted, 'was', 'were')} accepted,
          worth <MoneyText value={w.acceptedValue} whole />.
        </p>
        <p className="t-body">
          {w.newJobs} new {w.newJobs === 1 ? word(false, true) : jobWord} came in, and <MoneyText value={w.invoicesPaidTotal} whole /> was paid to you.
        </p>
        <p className="t-body">
          {w.waitingToQuote} {w.waitingToQuote === 1 ? word(false, true) : jobWord} {plural(w.waitingToQuote, 'is', 'are')} waiting for you to write a quote.{' '}
          {w.sentWaiting} {plural(w.sentWaiting, 'quote is', 'quotes are')} waiting for a yes.
        </p>
      </div>

      <div className="grid-cards week-tiles">
        <StatTile label="Quotes sent" value={w.quotesSent} />
        <StatTile label="Quotes accepted" value={w.quotesAccepted} tone="good" hint={<MoneyText value={w.acceptedValue} whole />} />
        <StatTile label={`New ${jobWord}`} value={w.newJobs} />
        <StatTile label="Money in" value={<MoneyText value={w.invoicesPaidTotal} whole />} tone="good" />
        <StatTile
          label="Overdue invoices"
          value={w.overdueInvoices.length}
          tone={w.overdueInvoices.length > 0 ? 'bad' : 'plain'}
          hint={w.overdueInvoices.length > 0 ? <MoneyText value={w.overdueTotal} whole /> : 'None. Good.'}
        />
        <StatTile label="Quotes about to run out" value={runningOut.length} tone={runningOut.length > 0 ? 'warn' : 'plain'} />
        <StatTile label={`${word(true)} that look stuck`} value={w.stuckJobs.length} tone={w.stuckJobs.length > 0 ? 'warn' : 'plain'} />
        <StatTile label="Booked in the next 7 days" value={w.upcoming.length} />
      </div>

      <Section title="Overdue invoices">
        {w.overdueInvoices.length === 0 ? (
          <EmptyState title="Nothing overdue. Nice work." />
        ) : (
          <PagedList items={w.overdueInvoices} noun="overdue invoices" render={(rows) => (
          <div className="tbl-wrap">
            <table className="tbl tbl-click tbl-stack">
              <caption className="sr-only">Invoices that are overdue</caption>
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">{word()}</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num-col">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const job = getJob(inv.jobId, s)
                  return (
                    <tr key={inv.id}>
                      <th scope="row" data-label="Invoice">
                        <a href={href.job(inv.jobId)} className="row-link">
                          {inv.number} {inv.label}
                        </a>
                      </th>
                      <td data-label={word()}>{job?.name ?? ''}</td>
                      <td data-label="Status">
                        <span className="badge st-hot">
                          {inv.dueDate ? `Overdue, was due ${fmtDate(inv.dueDate)}` : 'Overdue'}
                        </span>
                      </td>
                      <td data-label="Amount" className="num-col text-hot font-bold">
                        <MoneyText value={inv.amount} whole />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )} />
        )}
      </Section>

      <Section title="Quotes about to run out">
        {runningOut.length === 0 ? (
          <EmptyState title="No quotes are about to run out." />
        ) : (
          <PagedList items={runningOut} noun="quotes" render={(rows) => (
          <div className="tbl-wrap">
            <table className="tbl tbl-click tbl-stack">
              <caption className="sr-only">Sent quotes that are about to run out, have run out, or have had no answer</caption>
              <thead>
                <tr>
                  <th scope="col">Quote</th>
                  <th scope="col">{word()}</th>
                  <th scope="col">What is happening</th>
                  <th scope="col" className="num-col">
                    Value before GST
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.quote.id}>
                    <th scope="row" data-label="Quote">
                      <a href={href.job(n.job.id)} className="row-link">
                        {n.quote.number} for {customerName(n.job)}
                      </a>
                    </th>
                    <td data-label={word()}>{n.job.name}</td>
                    <td data-label="What is happening">{nudgeLabel(n)}</td>
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

      <Section title={`${word(true)} that look stuck`}>
        {w.stuckJobs.length === 0 ? (
          <EmptyState title={`No ${jobWord} look stuck. Nice work.`} />
        ) : (
          <PagedList items={w.stuckJobs} noun="jobs" render={(rows) => (
          <div className="tbl-wrap">
            <table className="tbl tbl-click tbl-stack">
              <caption className="sr-only">Jobs that have been in the same stage a long time</caption>
              <thead>
                <tr>
                  <th scope="col">{word()}</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Time in stage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => (
                  <tr key={j.id}>
                    <th scope="row" data-label={word()}>
                      <a href={href.job(j.id)} className="row-link">
                        {j.name}
                      </a>
                    </th>
                    <td data-label="Stage">
                      <StageBadge stage={j.stage} />
                    </td>
                    <td data-label="Time in stage">
                      <StallBadge job={j} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )} />
        )}
      </Section>

      <Section title="Booked in the next 7 days">
        {w.upcoming.length === 0 ? (
          <EmptyState title="Nothing booked yet." />
        ) : (
          <PagedList items={w.upcoming} noun="bookings" render={(rows) => (
          <div className="tbl-wrap">
            <table className="tbl tbl-click tbl-stack">
              <caption className="sr-only">Appointments in the next 7 days</caption>
              <thead>
                <tr>
                  <th scope="col">What</th>
                  <th scope="col">{word()}</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ job, appt }) => (
                  <tr key={appt.id}>
                    <th scope="row" data-label="What">
                      <a href={href.job(job.id)} className="row-link">
                        {appt.title}
                      </a>
                    </th>
                    <td data-label={word()}>{job.name}</td>
                    <td data-label="When">
                      {fmtDate(appt.date)} at {appt.time}
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
