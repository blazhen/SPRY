import { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { TALK_MESSAGES, createDictation, getRecognitionCtor, insertSpoken, microphoneAllowedByPage, type Dictation, type TalkErrorKind } from '../lib/speech'
import './talkButton.css'

/** True when this browser can turn speech into text. Where it cannot, the Talk button is not shown at all. */
export function talkSupported(): boolean {
  return getRecognitionCtor() !== null
}

/**
 * The Talk button for a free-text box: tap to start, the spoken words are added at the cursor as you speak, tap again to stop.
 * It only puts text in the box (through onChange). It never saves, sends or drafts anything by itself.
 * Speech is turned into text by the browser's own speech recognition; the Hub never records or stores audio.
 * Used by every note box, so there is one copy of this behaviour.
 */
export function TalkButton({ getBox, value, onChange, maxLength, label = 'Talk' }: { getBox: () => HTMLTextAreaElement | null; value: string; onChange: (v: string) => void; maxLength?: number; label?: string }) {
  const [supported] = useState(talkSupported)
  const [listening, setListening] = useState(false)
  const [err, setErr] = useState<TalkErrorKind | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const dictation = useRef<Dictation | null>(null)
  // Where the spoken words go: text before and after the cursor when Talk was tapped (moved again if you type while listening).
  const slot = useRef({ before: '', after: '', placedFinal: 0, last: null as string | null })

  useEffect(() => () => dictation.current?.stop(), [])
  if (!supported) return null

  const place = (final: string, interim: string) => {
    const el = getBox()
    const s = slot.current
    const cur = valueRef.current
    if (s.last !== null && cur !== s.last) {
      // You typed or moved the cursor while listening: the next words go where the cursor is now.
      const a = el?.selectionStart ?? cur.length
      const b = el?.selectionEnd ?? a
      s.before = cur.slice(0, a)
      s.after = cur.slice(b)
    }
    // Words the browser is sure of become part of the box for good; the guess (interim) is replaced on the next update.
    const newFinal = final.slice(s.placedFinal)
    if (newFinal) {
      const f = insertSpoken(s.before, s.after, newFinal)
      s.before = f.text.slice(0, f.caret)
      s.after = f.text.slice(f.caret)
      s.placedFinal = final.length
    }
    let { text, caret } = insertSpoken(s.before, s.after, interim)
    if (maxLength && text.length > maxLength) {
      text = text.slice(0, maxLength)
      caret = Math.min(caret, maxLength)
    }
    s.last = text
    onChange(text)
    requestAnimationFrame(() => {
      try {
        getBox()?.setSelectionRange(caret, caret)
      } catch {
        /* box gone */
      }
    })
  }

  const toggle = () => {
    if (dictation.current?.listening) {
      dictation.current.stop()
      return
    }
    setErr(null)
    const ctor = getRecognitionCtor()
    if (!ctor) return
    if (!microphoneAllowedByPage()) {
      setErr('blocked')
      return
    }
    const el = getBox()
    const cur = valueRef.current
    const a = el?.selectionStart ?? cur.length
    const b = el?.selectionEnd ?? a
    slot.current = { before: cur.slice(0, a), after: cur.slice(b), placedFinal: 0, last: null }
    dictation.current = createDictation({
      ctor,
      lang: 'en-AU',
      onText: place,
      onListening: setListening,
      onError: setErr,
    })
    dictation.current.start()
  }

  return (
    <div className="talk" data-talk>
      <button
        type="button"
        className={'btn btn-neutral talk-btn' + (listening ? ' talk-on' : '')}
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? 'Stop listening' : `${label}: speak instead of typing`}
        data-talk-button
      >
        {listening ? <span className="talk-dot" aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
        <span>{listening ? 'Listening, tap to stop' : label}</span>
      </button>
      <span className="talk-msg" role="status" aria-live="polite" data-talk-msg>
        {listening ? 'Speak now. Your words appear in the box.' : ''}
      </span>
      {err && (
        <p className="talk-err" role="alert" data-talk-error>
          {TALK_MESSAGES[err]}
        </p>
      )}
    </div>
  )
}
