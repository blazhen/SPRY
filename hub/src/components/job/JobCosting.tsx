import { InlineField } from '../InlineField'
import { CostingDocs } from '../photos/CostingDocs'
import { Section } from './Section'
import { jobCosting } from '../../lib/extras'
import { fmtMoney } from '../../lib/format'
import { quoteTotals } from '../../lib/calc'
import { getJob, quotesForJob, updateJob, useStore } from '../../lib/store'
import { toast } from '../ui'
import { useExtra } from '../../lib/useExtras'

/** What the customer pays before GST: the accepted quote, else the newest sent one, else the job value. */
function quotedExGst(jobId: string, s: ReturnType<typeof useStore>): { amount: number; from: string } {
  const qs = quotesForJob(jobId, s).filter((q) => q.kind !== 'addon')
  const accepted = qs.filter((q) => q.status === 'Accepted').sort((a, b) => (b.acceptedAt ?? '').localeCompare(a.acceptedAt ?? ''))[0]
  if (accepted) return { amount: quoteTotals(accepted).subtotal, from: `accepted quote ${accepted.number}` }
  const sent = qs.filter((q) => q.status === 'Sent').sort((a, b) => (b.sentAt ?? '').localeCompare(a.sentAt ?? ''))[0]
  if (sent) return { amount: quoteTotals(sent).subtotal, from: `sent quote ${sent.number}` }
  return { amount: getJob(jobId, s)?.value ?? 0, from: 'the job value' }
}

const money = (v: string): number | undefined => {
  const t = v.replace(/[$,\s]/g, '')
  if (t === '') return 0
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Job costing (Advanced extra): actual materials and cost on the job, with profit and margin. Staff only. */
export function JobCosting({ jobId }: { jobId: string }) {
  const on = useExtra('costing')
  const s = useStore()
  const job = getJob(jobId, s)
  if (!on || !job) return null
  const q = quotedExGst(jobId, s)
  const c = jobCosting(q.amount, job.actualMaterials, job.actualCost)
  const save = (key: 'actualMaterials' | 'actualCost') => (v: string) => {
    const n = money(v)
    if (n === undefined) {
      toast('Type the amount as a number, for example 1200.')
      return false
    }
    updateJob(jobId, { [key]: n === 0 ? undefined : n })
    return true
  }
  return (
    <Section id="job-costing-section" title="Job costing" summary={c ? `Margin ${c.marginPct}%` : 'No actual cost yet'}>
      <div className="stack" data-extra="job-costing">
        <InlineField label="Actual materials ($, ex GST)" inputMode="decimal" value={job.actualMaterials ? String(job.actualMaterials) : ''} placeholder="Not entered yet. Click to add." onSave={save('actualMaterials')} />
        <InlineField label="Actual cost, everything ($, ex GST)" inputMode="decimal" value={job.actualCost ? String(job.actualCost) : ''} placeholder="Not entered yet. Click to add." hint="Materials, labour and anything else. Leave empty to use the materials." onSave={save('actualCost')} />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div>
            <dt className="text-muted">Quoted (ex GST)</dt>
            <dd className="font-bold">{fmtMoney(q.amount)}</dd>
            <dd className="hint">From {q.from}</dd>
          </div>
          <div>
            <dt className="text-muted">Actual cost</dt>
            <dd className="font-bold">{c ? fmtMoney(c.actualCost) : 'Not entered'}</dd>
          </div>
          <div>
            <dt className="text-muted">Profit</dt>
            <dd className="font-bold" data-costing-profit>
              {c ? fmtMoney(c.profit) : 'Not known'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Margin</dt>
            <dd className="font-bold" data-costing-margin>
              {c ? `${c.marginPct}%` : 'Not known'}
            </dd>
          </div>
        </dl>
        <CostingDocs jobId={jobId} />
        <p className="hint">Staff only. Nothing here goes to the customer.</p>
      </div>
    </Section>
  )
}
