import { Fragment, useId, useState, type ReactNode } from 'react'
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react'
import { ContactFieldsEditor } from '../../ContactFieldsEditor'
import { JobFieldsEditor } from '../../JobFieldsEditor'
import { Section } from '../Section'
import { SameCompanyNotice } from '../SameCompanyNotice'
import { ContactField, JobField, NoContact, jobContacts } from '../JobFacts'
import { resolveFields, useFieldCatalog, type FieldBox, type FieldDef } from '../../../lib/boxFields'
import { href } from '../../../lib/router'
import { getCompany, getContact, getJob, useStore } from '../../../lib/store'
import '../jobFacts.css'
import '../jobLeft.css'

/**
 * Draw the chosen fields in order. Custom CRM fields next to each other are drawn by one editor call (it keeps its own
 * Save and Cancel). Everything flat.
 */
function FieldList({
  box,
  fields,
  renderOne,
  renderCustom,
}: {
  box: FieldBox
  fields?: string[]
  renderOne: (id: string) => ReactNode
  renderCustom?: (ids: string[]) => ReactNode
}) {
  const { fields: catalog } = useFieldCatalog(box)
  const list = resolveFields(box, fields, catalog)

  const draw = (items: FieldDef[]): ReactNode[] => {
    const out: ReactNode[] = []
    let run: string[] = []
    const flush = () => {
      if (run.length && renderCustom) out.push(<Fragment key={`cf-${run[0]}`}>{renderCustom(run)}</Fragment>)
      run = []
    }
    for (const f of items) {
      if (f.custom) run.push(f.id)
      else {
        flush()
        out.push(<Fragment key={f.id}>{renderOne(f.id)}</Fragment>)
      }
    }
    flush()
    return out
  }

  if (list.length === 0) return <p className="hint">No fields chosen for this box. Use Edit layout to pick some.</p>

  return <div className="jl-group-body">{draw(list)}</div>
}

/** The Job box: the job's own fields (and chosen job custom fields). `fields` = shown ids in order, absent = all. */
export function JobBox({ jobId, fields }: { jobId: string; fields?: string[] }) {
  const s = useStore()
  const job = getJob(jobId, s)
  if (!job) return null
  return (
    <Section id="job-box-section" title="Job">
      <FieldList
        box="job"
        fields={fields}
        renderOne={(id) => <JobField job={job} id={id} />}
        renderCustom={(ids) => <JobFieldsEditor jobId={job.id} embedded only={ids} />}
      />
    </Section>
  )
}

/** The Contact box: one person's fields. With several people a "Person" select chooses whose card shows. */
export function ContactBox({ jobId, fields }: { jobId: string; fields?: string[] }) {
  const s = useStore()
  const uid = useId()
  const [pick, setPick] = useState('')
  const job = getJob(jobId, s)
  if (!job) return null
  const { main, others } = jobContacts(job, s)
  const people = [...(main ? [main] : []), ...others]
  const person = people.find((p) => p.id === pick) ?? main

  return (
    <Section id="job-contact-box-section" title="Contact" count={people.length > 1 ? people.length : undefined}>
      {person ? (
        <div className="jl-group-body">
          <SameCompanyNotice jobId={job.id} />
          {people.length > 1 && (
            <div>
              <label className="inline-field-label" htmlFor={`${uid}-person`}>
                Person
              </label>
              <select id={`${uid}-person`} className="field" value={person.id} onChange={(e) => setPick(e.target.value)}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || 'No name'}
                  </option>
                ))}
              </select>
            </div>
          )}
          <a className="hint font-semibold underline" href={href.contact(person.id)} data-open-full-contact>
            Open full contact
          </a>
          <FieldList
            key={person.id}
            box="contact"
            fields={fields}
            renderOne={(id) => <ContactField key={`${person.id}-${id}`} c={person} id={id} />}
            renderCustom={(ids) => <ContactFieldsEditor key={`${person.id}-${ids.join(',')}`} contactId={person.id} embedded only={ids} />}
          />
        </div>
      ) : (
        <div className="jl-group-body">
          <SameCompanyNotice jobId={job.id} />
          <NoContact />
        </div>
      )}
    </Section>
  )
}

/** One company, read only: name, phone, email, address and who quotes go to, as far as the field ids allow. */
function CompanyCard({ id, shown }: { id: string; shown: string[] }) {
  const s = useStore()
  const co = getCompany(id, s)
  if (!co) return null
  const attn = co.attnContactId ? getContact(co.attnContactId, s) : undefined
  const has = (f: string) => shown.includes(f)
  const nothing = !(has('phone') && co.phone) && !(has('email') && co.email) && !(has('address') && co.address) && !(has('attn') && attn) && !has('name')
  const parts: Record<string, ReactNode> = {
    name: <p className="jl-static-text font-bold">{co.name}</p>,
    phone: co.phone ? (
      <a className="btn btn-neutral" href={`tel:${co.phone.replace(/[^+\d]/g, '')}`}>
        <Phone size={16} aria-hidden="true" />
        {co.phone}
      </a>
    ) : null,
    email: co.email ? (
      <a className="btn btn-neutral" href={`mailto:${co.email}`}>
        <Mail size={16} aria-hidden="true" />
        {co.email}
      </a>
    ) : null,
    address: co.address ? (
      <p className="jl-static-text">
        <MapPin size={16} aria-hidden="true" /> {co.address}
      </p>
    ) : null,
    attn: attn ? (
      <p className="hint">
        Quotes go to {attn.name}.{' '}
        <a href={href.contact(attn.id)}>
          Open <ExternalLink size={12} aria-hidden="true" />
        </a>
      </p>
    ) : null,
  }
  return (
    <div className="jl-group-body" data-company-card role="group" aria-label={co.name || 'Company'}>
      {shown.map((f) => (
        <Fragment key={f}>{parts[f] ?? null}</Fragment>
      ))}
      {nothing && <p className="hint">No details kept for this company.</p>}
    </div>
  )
}

/** The Company box: one read only card per company on the job. Nothing at all when the job has no company. */
export function CompanyBox({ jobId, fields }: { jobId: string; fields?: string[] }) {
  const s = useStore()
  const { fields: catalog } = useFieldCatalog('company')
  const job = getJob(jobId, s)
  if (!job) return null
  const companies = job.participants.filter((p) => p.kind === 'company').map((p) => p.id)
  if (companies.length === 0) return null
  const shown = resolveFields('company', fields, catalog).map((f) => f.id)
  return (
    <Section id="job-company-box-section" title="Company" count={companies.length > 1 ? companies.length : undefined}>
      {shown.length === 0 ? (
        <p className="hint">No fields chosen for this box. Use Edit layout to pick some.</p>
      ) : (
        <div className="jl-group-body">
          {companies.map((id) => (
            <CompanyCard key={id} id={id} shown={shown} />
          ))}
        </div>
      )}
    </Section>
  )
}
