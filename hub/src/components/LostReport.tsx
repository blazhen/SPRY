import { EmptyState, MoneyText, Section } from './ui'
import { lostReport, type LostRow } from '../lib/extras'
import { useStore } from '../lib/store'
import { useExtra } from '../lib/useExtras'
import { word } from '../lib/format'

function Table({ title, rows }: { title: string; rows: LostRow[] }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl tbl-stack">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr>
            <th scope="col">{title}</th>
            <th scope="col" className="num-col">
              Lost
            </th>
            <th scope="col" className="num-col">
              Value before GST
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" data-label={title}>
                {r.label}
              </th>
              <td data-label="Lost" className="num-col">
                {r.count}
              </td>
              <td data-label="Value before GST" className="num-col">
                <MoneyText value={r.value} whole />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Lost jobs by reason and by lead source (Advanced extra). */
export function LostReport() {
  const on = useExtra('lostReport')
  const s = useStore()
  if (!on) return null
  const r = lostReport(s.jobs)
  return (
    <Section title={`Lost ${word(true, true)} (${r.total})`}>
      <div data-extra="lost-report">
        {r.total === 0 ? (
          <EmptyState title={`No ${word(true, true)} marked lost.`} />
        ) : (
          <div className="stack">
            <p className="t-body">
              {r.total} lost, <MoneyText value={r.value} whole /> before GST.
            </p>
            <Table title="Reason" rows={r.byReason} />
            <Table title="Lead source" rows={r.bySource} />
          </div>
        )}
      </div>
    </Section>
  )
}
