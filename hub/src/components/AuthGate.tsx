import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2, Lock, RefreshCw, ServerCrash, WifiOff } from 'lucide-react'
import { DATA_SOURCE } from '../config'
import { AUTH_LOST_EVENT, captureToken } from '../lib/api'
import { isEmbeddedInCrm, verifyAuth, type AuthResult } from '../lib/access'
import { useRoute } from '../lib/router'

// Take the token out of the address as early as possible (live mode only).
if (DATA_SOURCE === 'live') captureToken()

type Gate = { state: 'checking' } | AuthResult

/**
 * Live mode: the staff app shows only after GET /api/auth says ok.
 * Mock mode and the customer page (#/view/:id) pass straight through.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const route = useRoute()
  if (DATA_SOURCE !== 'live' || route.name === 'view') return <>{children}</>
  return <LiveGate>{children}</LiveGate>
}

function LiveGate({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>({ state: 'checking' })

  const check = useCallback(async () => {
    setGate({ state: 'checking' })
    setGate(await verifyAuth())
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  useEffect(() => {
    const lost = () => setGate({ state: 'denied' })
    window.addEventListener(AUTH_LOST_EVENT, lost)
    return () => window.removeEventListener(AUTH_LOST_EVENT, lost)
  }, [])

  if (gate.state === 'allowed') return <>{children}</>
  return <GateScreen gate={gate} onRetry={() => void check()} />
}

function GateScreen({ gate, onRetry }: { gate: Gate; onRetry: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [gate.state])

  let Icon = Lock
  let title = 'Checking access'
  let text = 'One moment.'
  let retry = false
  if (gate.state === 'denied') {
    title = 'This page is locked'
    text = isEmbeddedInCrm()
      ? 'Your link did not work or has expired. Close this and open it again from the CRM.'
      : 'Open this from inside the CRM.'
  } else if (gate.state === 'notConfigured') {
    Icon = ServerCrash
    title = 'Not set up yet'
    text = 'The Hub has not been set up on the server yet. Tell the person who looks after the CRM.'
  } else if (gate.state === 'offline') {
    Icon = WifiOff
    title = 'Cannot reach the server'
    text = 'Check your internet connection, then try again.'
    retry = true
  } else if (gate.state === 'checking') {
    Icon = Loader2
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-4">
      <div className="card w-full max-w-md text-center" role={gate.state === 'checking' ? 'status' : 'alert'}>
        <Icon
          size={40}
          strokeWidth={2}
          aria-hidden="true"
          className={`mx-auto mb-4 text-navy ${gate.state === 'checking' ? 'animate-spin motion-reduce:animate-none' : ''}`}
        />
        <h1 ref={heading} tabIndex={-1} className="mb-2 text-2xl font-bold text-ink outline-none">
          {title}
        </h1>
        <p className="mb-0 text-muted">{text}</p>
        {retry && (
          <button type="button" className="btn btn-primary mt-6" onClick={onRetry}>
            <RefreshCw size={18} aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    </main>
  )
}
