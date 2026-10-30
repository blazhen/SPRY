import { useState } from 'react'
import { ExternalLink, Link2 } from 'lucide-react'
import { DATA_SOURCE } from '../config'
import { customerLink } from '../lib/publicQuote'
import type { Quote } from '../types'
import { toast } from './ui'

const LIVE = DATA_SOURCE === 'live'

/** Why a quote has no customer link yet, or '' when it has one. The server only shows a quote that has been sent. */
export function linkBlockedReason(q: Quote): string {
  if (q.status === 'Draft') return 'Send the quote first'
  if (q.status === 'Superseded') return 'This quote was replaced by a newer one'
  return ''
}

/** Live: asks the server for the key, trying a few times because the quote may only just have been saved. Mock: the plain link. */
export async function linkFor(id: string, tries = 1): Promise<string> {
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await customerLink(id, LIVE)
    } catch (e) {
      last = e
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw last
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const t = document.createElement('textarea')
      t.value = text
      t.setAttribute('readonly', '')
      t.style.position = 'fixed'
      t.style.opacity = '0'
      document.body.appendChild(t)
      t.select()
      const ok = document.execCommand('copy')
      t.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** "Copy customer link" and "Open as customer". Disabled for a draft, with the reason next to it (or in the tooltip when compact). */
export default function CustomerLinkButtons({ quote, compact = false }: { quote: Quote; compact?: boolean }) {
  const [busy, setBusy] = useState(false)
  const why = linkBlockedReason(quote)
  const cls = compact ? 'btn btn-ghost btn-icon' : 'btn btn-quiet'

  async function copy() {
    if (busy) return
    setBusy(true)
    try {
      const link = await linkFor(quote.id)
      toast((await copyText(link)) ? 'Customer link copied' : `Could not copy. The link is ${link}`)
    } catch {
      toast('Could not get the customer link. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }
  async function openAs() {
    if (busy) return
    setBusy(true)
    try {
      window.open(await linkFor(quote.id), '_blank', 'noopener')
    } catch {
      toast('Could not get the customer link. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-customer-link>
      <button type="button" className={cls} onClick={copy} disabled={!!why || busy} title={why || 'Copy customer link'} aria-label={compact ? 'Copy customer link' : undefined}>
        <Link2 size={compact ? 18 : 20} aria-hidden="true" />
        {!compact && 'Copy customer link'}
      </button>
      <button type="button" className={cls} onClick={openAs} disabled={!!why || busy} title={why || 'Open as customer'} aria-label={compact ? 'Open as customer' : undefined}>
        <ExternalLink size={compact ? 18 : 20} aria-hidden="true" />
        {!compact && 'Open as customer'}
      </button>
      {why && !compact && (
        <span className="t-small text-muted" data-customer-link-why>
          {why}
        </span>
      )}
    </span>
  )
}
