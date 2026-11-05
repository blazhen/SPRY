import { useEffect, useRef, useState } from 'react'
import { DATA_SOURCE } from '../config'
import { conversationsApi } from './api'
import type { Message } from '../types'

const LIVE = DATA_SOURCE === 'live'

// Cache of messages fetched from the CRM per contactId
const contactMessagesCache = new Map<string, Message[]>()
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function subscribeConversations(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Returns all cached messages for a contact. */
export function getLoadedMessages(contactId: string): Message[] {
  return contactMessagesCache.get(contactId) ?? []
}

/** Hook to fetch and view live CRM conversation messages for a contact. */
export function useContactConversations(contactId: string): {
  messages: Message[]
  loading: boolean
  error: string
  refresh: () => void
} {
  const [messages, setMessages] = useState<Message[]>(() => contactMessagesCache.get(contactId) ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // The contact this hook is showing now, so a slow answer for the previous contact is dropped.
  const current = useRef(contactId)
  current.current = contactId

  const load = async () => {
    if (!LIVE || !contactId) return
    const asked = contactId
    setLoading(true)
    setError('')
    try {
      const rows = await conversationsApi.listForContact(asked)
      contactMessagesCache.set(asked, rows)
      if (current.current === asked) setMessages(rows)
      notify()
    } catch (e: any) {
      if (current.current === asked) setError(e?.message ?? 'Could not load conversations')
    } finally {
      if (current.current === asked) setLoading(false)
    }
  }

  // A call, text or email logged by hand lands in the cache: show it at once.
  useEffect(() => {
    setMessages(contactMessagesCache.get(contactId) ?? [])
    const off = subscribeConversations(() => setMessages(contactMessagesCache.get(contactId) ?? []))
    return () => {
      off()
    }
  }, [contactId])

  useEffect(() => {
    if (!LIVE || !contactId) return
    if (contactMessagesCache.has(contactId)) {
      setMessages(contactMessagesCache.get(contactId)!)
      return
    }
    load()
  }, [contactId])

  return { messages, loading, error, refresh: load }
}

/** Logs a manual call, email note, or text note locally so it immediately shows up. */
export function logManualMessage(message: Omit<Message, 'id' | 'at'>): Message {
  const full: Message = {
    ...message,
    id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    at: new Date().toISOString(),
  }
  const key = message.contactId || message.jobId
  if (key) {
    const existing = contactMessagesCache.get(key) ?? []
    contactMessagesCache.set(key, [full, ...existing])
    notify()
  }
  return full
}

/**
 * Construct URL or trigger to open the CRM conversation.
 * When embedded in the CRM iframe:
 * Clicking will target _top or a new tab to the CRM's native conversation window.
 */
function getLocationId(): string {
  try {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('hub.token') : null
    if (!token) return ''
    const parts = token.split('.')
    if (parts.length >= 2 && parts[1]) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      return typeof payload.loc === 'string' ? payload.loc : ''
    }
  } catch {
    // ignore
  }
  return ''
}

/**
 * Construct URL or trigger to open the CRM conversation / contact in the CRM.
 * When embedded in the CRM iframe:
 * Clicking will target _top or a new tab to the CRM's native conversation window inside the proper location.
 */
export function openCrmConversation(contactId?: string) {
  if (typeof window === 'undefined') return

  const loc = getLocationId()

  let crmBase = ''
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer)
      crmBase = refUrl.origin
    } catch {
      // ignore
    }
  }

  // Under v2 routing in the CRM, sub-account URLs must be prefixed with /v2/location/:locationId
  const locPrefix = loc ? `/v2/location/${loc}` : ''
  const targetPath = contactId
    ? `${locPrefix}/contacts/detail/${contactId}`
    : `${locPrefix}/conversations`

  if (crmBase) {
    window.open(`${crmBase}${targetPath}`, '_blank', 'noopener,noreferrer')
  } else {
    // Open relative to top if inside same origin or window
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = targetPath
        return
      }
    } catch {
      // cross-origin frame, open new window
    }
    window.open(targetPath, '_blank', 'noopener,noreferrer')
  }
}
