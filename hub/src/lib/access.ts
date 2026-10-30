import { AuthError, NetworkError, NotConfiguredError, verifyAuthCall } from './api'

/** A hint only. Being framed proves nothing: the server decides through the signed token. */
export function isEmbeddedInCrm(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true // cross-origin parent blocks the comparison, which means we are framed
  }
}

export type AuthResult =
  | { state: 'allowed' }
  | { state: 'denied' }
  | { state: 'notConfigured'; message: string }
  | { state: 'offline'; message: string }

/** Asks the server (GET /api/auth). Never throws. */
export async function verifyAuth(): Promise<AuthResult> {
  try {
    return (await verifyAuthCall()) ? { state: 'allowed' } : { state: 'denied' }
  } catch (e) {
    if (e instanceof AuthError) return { state: 'denied' }
    if (e instanceof NotConfiguredError) return { state: 'notConfigured', message: e.message }
    if (e instanceof NetworkError) return { state: 'offline', message: e.message }
    return { state: 'offline', message: 'The server gave an unexpected answer' }
  }
}
