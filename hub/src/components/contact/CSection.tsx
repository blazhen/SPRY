import type { ReactNode } from 'react'
import { Section as JobSection } from '../job/Section'
import { Section as UiSection } from '../ui'

/**
 * The box every contact section sits in. On the contact page (`compact` false) it is the shared open/close section, the
 * same as the job page boxes. In a side pane (`compact` true) it is a plain
 * titled block. The anchor id is always on the outside so the rail and the proofs can find it.
 */
export function CSection({
  id,
  title,
  count,
  summary,
  compact = false,
  children,
}: {
  id: string
  title: string
  count?: number
  summary?: string
  compact?: boolean
  children: ReactNode
}) {
  if (compact) {
    return (
      <div id={id} className="min-w-0">
        <UiSection title={title}>{children}</UiSection>
      </div>
    )
  }
  return (
    <JobSection id={id} title={title} count={count} summary={summary}>
      {children}
    </JobSection>
  )
}

export type ContactSectionProps = { contactId: string; compact?: boolean }
