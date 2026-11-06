/**
 * Talk instead of typing: the logic behind the Talk button (src/components/TalkButton.tsx).
 * Uses the browser's own speech recognition (SpeechRecognition / webkitSpeechRecognition). The Hub never records,
 * stores or sends audio itself. No React in this file, so it is tested on its own with a fake recogniser.
 */

export type TalkErrorKind = 'blocked' | 'nospeech' | 'network' | 'nomic' | 'other'

export const TALK_MESSAGES: Record<TalkErrorKind, string> = {
  blocked: 'The microphone is blocked here. Allow it in the browser, or use the microphone on your phone keyboard.',
  nospeech: 'I did not hear anything, so I stopped listening. Tap Talk to try again.',
  network: 'Talking needs an internet connection and the speech service could not be reached. Try again, or use the microphone on your phone keyboard.',
  nomic: 'No microphone was found. Check one is connected, or use the microphone on your phone keyboard.',
  other: 'Talking did not work this time. Try again, or use the microphone on your phone keyboard.',
}

/** Browser error code to our kind. null means ignore it (the user or the browser stopped it on purpose). */
export function mapSpeechError(code: string | undefined): TalkErrorKind | null {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'blocked'
    case 'no-speech':
      return 'nospeech'
    case 'network':
      return 'network'
    case 'audio-capture':
      return 'nomic'
    case 'aborted':
      return null
    default:
      return 'other'
  }
}

/** What the box holds when `spoken` goes in at the cursor: one space between words, none doubled, none at the ends. */
export function insertSpoken(before: string, after: string, spoken: string): { text: string; caret: number } {
  const words = spoken.replace(/\s+/g, ' ').trim()
  if (!words) return { text: before + after, caret: before.length }
  const lead = before !== '' && !/\s$/.test(before) ? ' ' : ''
  const tail = after !== '' && !/^\s/.test(after) ? ' ' : ''
  const head = before + lead + words
  return { text: head + tail + after, caret: head.length }
}

/** Minimal shape of the browser's recogniser (the real one has more). */
export interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: any) => void) | null // eslint-disable-line @typescript-eslint/no-explicit-any
  onerror: ((e: any) => void) | null // eslint-disable-line @typescript-eslint/no-explicit-any
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
export type RecognitionCtor = new () => RecognitionLike

export function getRecognitionCtor(w: unknown = typeof window === 'undefined' ? undefined : window): RecognitionCtor | null {
  const x = w as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor } | undefined
  return x?.SpeechRecognition ?? x?.webkitSpeechRecognition ?? null
}

/** In a CRM iframe the page needs allow="microphone" from the CRM. Where the browser can say it is missing, say so early. */
export function microphoneAllowedByPage(doc: unknown = typeof document === 'undefined' ? undefined : document): boolean {
  try {
    const d = doc as { permissionsPolicy?: { allowsFeature(f: string): boolean }; featurePolicy?: { allowsFeature(f: string): boolean } } | undefined
    const p = d?.permissionsPolicy ?? d?.featurePolicy
    return p ? p.allowsFeature('microphone') !== false : true
  } catch {
    return true
  }
}

export interface DictationOptions {
  ctor: RecognitionCtor
  lang?: string
  /** `final` is everything the browser is sure of since start, `interim` the guess at the words still being spoken. */
  onText(final: string, interim: string): void
  onListening(on: boolean): void
  onError(kind: TalkErrorKind): void
  /** Restarts allowed in a row without any words heard. Default 3. */
  maxIdleRestarts?: number
}

export interface Dictation {
  start(): void
  stop(): void
  readonly listening: boolean
}

/**
 * One dictation. Tap to start, tap again to stop. Browsers end a continuous session by themselves after a while, so
 * while the user still wants to listen the session is started again (the words so far are kept).
 */
export function createDictation(o: DictationOptions): Dictation {
  const maxIdle = o.maxIdleRestarts ?? 3
  let rec: RecognitionLike | null = null
  let wanted = false
  let finalText = ''
  let idleRestarts = 0
  let heardThisRun = false

  const finish = (err?: TalkErrorKind) => {
    wanted = false
    rec = null
    o.onListening(false)
    if (err) o.onError(err)
  }

  const run = () => {
    const r = new o.ctor()
    r.lang = o.lang ?? 'en-AU'
    r.continuous = true
    r.interimResults = true
    heardThisRun = false
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        const res = e.results[i]
        const t: string = res[0]?.transcript ?? ''
        if (res.isFinal) finalText += (finalText && !/\s$/.test(finalText) && !/^\s/.test(t) ? ' ' : '') + t.trim()
        else interim += t
      }
      heardThisRun = true
      idleRestarts = 0
      o.onText(finalText, interim)
    }
    r.onerror = (e) => {
      if (r !== rec) return
      const kind = mapSpeechError(e?.error)
      if (kind === null) return
      finish(kind)
    }
    r.onend = () => {
      if (r !== rec) return
      if (!wanted) return finish()
      // The browser ended the session while the user still wants to talk: start again.
      if (!heardThisRun && ++idleRestarts > maxIdle) return finish('nospeech')
      try {
        run()
      } catch {
        finish('other')
      }
    }
    rec = r
    r.start()
  }

  return {
    get listening() {
      return wanted
    },
    start() {
      if (wanted) return
      wanted = true
      finalText = ''
      idleRestarts = 0
      o.onListening(true)
      try {
        run()
      } catch {
        // start() throws when a session is already running or the page may not use the microphone.
        finish('blocked')
      }
    },
    stop() {
      if (!wanted) return
      wanted = false
      const r = rec
      try {
        r?.stop() // the browser sends the last words, then onend closes things
      } catch {
        /* already stopped */
      }
      if (!r) finish()
      else {
        const done = r
        setTimeout(() => {
          if (rec === done) finish() // onend never came: close it ourselves
        }, 1500)
      }
    },
  }
}
