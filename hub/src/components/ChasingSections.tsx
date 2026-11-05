import { CalendarCheck, Phone, PhoneCall, Plus } from 'lucide-react'
import { PagedList } from './Pager'
import { EmptyState, MoneyText, Section, StatTile, toast } from './ui'
import { chaseDue, chaseState, justOpened, openedCallNow, type QuoteOpen } from '../lib/extras'
import { quoteTotals } from '../lib/calc'
import { moneyToChase } from '../lib/insights'
import { useQuoteOpens } from '../lib/quoteOpens'
import { href } from '../lib/router'
import { chaseQuote, getContact, getJob, participantName, recipientContactId, todoQueue, useStore } from '../lib/store'
import { useExtra, useExtraSettings } from '../lib/useExtras'
import type { Quote } from '../types'

/** "5 minutes ago", "3 hours ago", "2 days ago". */
export function ago(iso: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60000))
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`
  const d = Math.round(hrs / 24)
  return `${d} ${d === 1 ? 'day' : 'days'} ago`
}

function ChaseNowButton({ quote, total }: { quote: Quote; total: number }) {
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm row-inner"
      onClick={() => {
        chaseQuote(quote.id, total)
        toast(`Chase logged on ${quote.number} and the job. Nothing was sent.`)
      }}
    >
      <PhoneCall size={16} aria-hidden="true" />
      Chase now
    </button>
  )
}

function CallLink({ quote }: { quote: Quote }) {
  const s = useStore()
  const id = recipientContactId(quote.recipient, s)
  const c = id ? getContact(id, s) : undefined
  const num = c?.mobile || c?.phone
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{participantName(quote.recipient, s)}</span>
      {num ? (
        <a className="cell-link inline-flex min-h-[44px] items-center" href={`tel:${num.replace(/[^+\d]/g, '')}`}>
          <Phone size={14} aria-hidden="true" className="mr-1 inline" />
          {num}
        </a>
      ) : null}
    </span>
  )
}

function ExtraLinks({ enquiry, sheet }: { enquiry: boolean; sheet: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" data-extra="extra-links">
      {enquiry && (
        <a href={href.enquiry()} className="btn btn-add btn-sm">
          <Plus size={16} aria-hidden="true" />
          New enquiry
        </a>
      )}
      {sheet && (
        <a href={href.daysheet()} className="btn btn-neutral btn-sm">
          <CalendarCheck size={16} aria-hidden="true" />
          Site day sheet
        </a>
      )}
    </div>
  )
}

/** My day: three numbers at the top of To do. Advanced extra. */
export function MyDay() {
  const s = useStore()
  const on = useExtra('myDay')
  const chasing = useExtra('chasing')
  const enquiry = useExtra('enquiry')
  const sheet = useExtra('daySheet')
  const opens = useQuoteOpens()
  if (!on && !enquiry && !sheet) return null
  if (!on) return <ExtraLinks enquiry={enquiry} sheet={sheet} />
  const write = todoQueue(undefined, s).length
  const fresh = chasing ? justOpened(openedCallNow(s.quotes, opens)).length : null
  const money = moneyToChase(s)
  const owed = money.reduce((a, m) => a + m.owing, 0)
  return (
    <section aria-label="My day" className="stack" data-extra="my-day">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-section">My day</h2>
        <div className="flex flex-wrap gap-2">
          {enquiry && (
            <a href={href.enquiry()} className="btn btn-add btn-sm">
              <Plus size={16} aria-hidden="true" />
              New enquiry
            </a>
          )}
          {sheet && (
            <a href={href.daysheet()} className="btn btn-neutral btn-sm">
              <CalendarCheck size={16} aria-hidden="true" />
              Site day sheet
            </a>
          )}
        </div>
      </div>
      <div className="grid-cards">
        <StatTile label="Quotes to write" value={write} tone={write > 0 ? 'warn' : 'plain'} />
        {fresh !== null && <StatTile label="Just opened" value={fresh} tone={fresh > 0 ? 'good' : 'plain'} hint="Customer opened the quote in the last 24 hours" />}
        <StatTile label="Money to chase" value={money.length} tone={money.some((m) => m.reason === 'overdue') ? 'bad' : money.length > 0 ? 'warn' : 'plain'} hint={money.length > 0 ? <MoneyText value={owed} whole /> : 'Nothing owing'} />
      </div>
    </section>
  )
}

/** Quotes the customer opened and has not answered, newest open first. Advanced extra. */
export function OpenedCallNow() {
  const s = useStore()
  const on = useExtra('chasing')
  const opens = useQuoteOpens()
  const { chaseDays } = useExtraSettings()
  if (!on) return null
  const rows = openedCallNow(s.quotes, opens)
  return (
    <Section title={`Opened, call now (${rows.length})`}>
      {rows.length === 0 ? (
        <EmptyState title="No sent quote has been opened yet." />
      ) : (
        <PagedList
          items={rows}
          noun="opened quotes"
          render={(page) => (
            <div className="tbl-wrap">
              <table className="tbl tbl-stack tbl-click" data-extra="opened-call-now">
                <caption className="sr-only">Sent quotes the customer has opened and not answered, newest open first</caption>
                <thead>
                  <tr>
                    <th scope="col">Quote</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Opened</th>
                    <th scope="col">Chase</th>
                    <th scope="col" className="num-col">
                      Total with GST
                    </th>
                    <th scope="col">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.map(({ quote, open }: { quote: Quote; open: QuoteOpen }) => {
                    const st = chaseState(quote.sentAt, quote.chases, chaseDays)
                    const job = getJob(quote.jobId, s)
                    return (
                      <tr key={quote.id}>
                        <th scope="row" data-label="Quote">
                          <a href={href.edit(quote.id)} className="row-link">
                            {quote.number}
                          </a>
                          {job && (
                            <span className="block text-muted">
                              <a href={href.job(job.id)} className="cell-link">
                                {job.name}
                              </a>
                            </span>
                          )}
                        </th>
                        <td data-label="Customer">
                          <CallLink quote={quote} />
                        </td>
                        <td data-label="Opened">
                          <strong>{ago(open.last)}</strong>
                          <span className="block text-muted">
                            {open.count} {open.count === 1 ? 'time' : 'times'}
                          </span>
                        </td>
                        <td data-label="Chase">{st.done === 0 ? 'Not chased yet' : `${st.done} of ${chaseDays.length} done`}</td>
                        <td data-label="Total with GST" className="num-col">
                          <MoneyText value={quoteTotals(quote).total} whole />
                        </td>
                        <td data-label="Action">
                          <ChaseNowButton quote={quote} total={chaseDays.length} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        />
      )}
    </Section>
  )
}

/** Sent quotes that are due their next chase by the chase days. Advanced extra. */
export function ChaseDueSection() {
  const s = useStore()
  const on = useExtra('chasing')
  const { chaseDays } = useExtraSettings()
  if (!on) return null
  const rows = chaseDue(s.quotes, chaseDays)
  return (
    <Section title={`Due a chase (${rows.length})`}>
      {rows.length === 0 ? (
        <EmptyState title={`Nothing is due. Chases are due ${chaseDays.join(', ')} days after sending.`} />
      ) : (
        <PagedList
          items={rows}
          noun="quotes due a chase"
          render={(page) => (
            <div className="tbl-wrap">
              <table className="tbl tbl-stack tbl-click" data-extra="chase-due">
                <caption className="sr-only">Sent quotes due their next chase, most overdue first</caption>
                <thead>
                  <tr>
                    <th scope="col">Quote</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Chase</th>
                    <th scope="col">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.map(({ quote, state }: { quote: Quote; state: ReturnType<typeof chaseState> }) => (
                    <tr key={quote.id}>
                      <th scope="row" data-label="Quote">
                        <a href={href.edit(quote.id)} className="row-link">
                          {quote.number}
                        </a>
                      </th>
                      <td data-label="Customer">
                        <CallLink quote={quote} />
                      </td>
                      <td data-label="Chase">
                        Chase {state.nextN} of {chaseDays.length}, sent {state.daysSinceSent} days ago{state.daysLate > 0 ? ` (${state.daysLate} late)` : ''}
                      </td>
                      <td data-label="Action">
                        <ChaseNowButton quote={quote} total={chaseDays.length} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        />
      )}
    </Section>
  )
}
