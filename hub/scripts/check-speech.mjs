// Unit checks for the Talk button logic (src/lib/speech.ts) with a fake SpeechRecognition. No browser, no network.
// Run: node scripts/check-speech.mjs
import { build } from 'esbuild'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hub-sp-')), 'speech.mjs')
await build({ entryPoints: [path.join(ROOT, 'src/lib/speech.ts')], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' })
const S = await import(pathToFileURL(out).href)

let pass = 0
let fail = 0
const ok = (n, c, x = '') => {
  c ? pass++ : fail++
  console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' :: ' + x}`)
}
const eq = (n, a, b) => ok(n, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) + ' vs ' + JSON.stringify(b))

// ---- text append ----
eq('append to empty box', S.insertSpoken('', '', 'roof 12 by 8'), { text: 'roof 12 by 8', caret: 12 })
eq('space added after existing text', S.insertSpoken('Walls done.', '', 'roof next'), { text: 'Walls done. roof next', caret: 21 })
eq('no double space when text ends in space', S.insertSpoken('Walls done. ', '', 'roof'), { text: 'Walls done. roof', caret: 16 })
eq('in the middle: spaces both sides', S.insertSpoken('abc', 'def', 'xyz'), { text: 'abc xyz def', caret: 7 })
eq('existing space after cursor kept as is', S.insertSpoken('abc', ' def', 'xyz'), { text: 'abc xyz def', caret: 7 })
eq('empty speech changes nothing', S.insertSpoken('abc', 'def', '  '), { text: 'abcdef', caret: 3 })
eq('spoken whitespace tidied', S.insertSpoken('', '', '  two   words \n'), { text: 'two words', caret: 9 })

// ---- error mapping ----
eq('not-allowed -> blocked', S.mapSpeechError('not-allowed'), 'blocked')
eq('service-not-allowed -> blocked', S.mapSpeechError('service-not-allowed'), 'blocked')
eq('no-speech -> nospeech', S.mapSpeechError('no-speech'), 'nospeech')
eq('network -> network', S.mapSpeechError('network'), 'network')
eq('audio-capture -> nomic', S.mapSpeechError('audio-capture'), 'nomic')
eq('aborted is ignored', S.mapSpeechError('aborted'), null)
eq('unknown -> other', S.mapSpeechError('weird'), 'other')
ok('blocked message is the agreed text', S.TALK_MESSAGES.blocked === 'The microphone is blocked here. Allow it in the browser, or use the microphone on your phone keyboard.')
ok('no message has a dash', Object.values(S.TALK_MESSAGES).every((m) => !/[–—]/.test(m)))

// ---- unsupported browser ----
ok('unsupported: no constructor found', S.getRecognitionCtor({}) === null)
ok('webkit prefix found', S.getRecognitionCtor({ webkitSpeechRecognition: function () {} }) !== null)
ok('page policy says microphone is off -> not allowed', S.microphoneAllowedByPage({ permissionsPolicy: { allowsFeature: () => false } }) === false)
ok('no policy API -> assumed allowed', S.microphoneAllowedByPage({}) === true)

// ---- fake recogniser ----
const made = []
class Fake {
  constructor() {
    made.push(this)
    this.started = 0
    this.stopped = 0
  }
  start() {
    if (this.throwOnStart) throw new Error('InvalidStateError')
    this.started++
  }
  stop() {
    this.stopped++
  }
  abort() {}
  say(parts, resultIndex = 0) {
    // parts: [[text, isFinal], ...] as the whole results list
    const results = parts.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f }))
    this.onresult({ resultIndex, results })
  }
}
const mk = (extra = {}) => {
  made.length = 0
  const log = { texts: [], listening: [], errors: [] }
  const d = S.createDictation({
    ctor: Fake,
    onText: (f, i) => log.texts.push([f, i]),
    onListening: (b) => log.listening.push(b),
    onError: (k) => log.errors.push(k),
    ...extra,
  })
  return { d, log }
}

{
  const { d, log } = mk()
  d.start()
  const r = made[0]
  ok('start: listening on, recogniser started en-AU, continuous', log.listening[0] === true && r.started === 1 && r.lang === 'en-AU' && r.continuous === true && r.interimResults === true)
  r.say([['roof twelve', false]])
  eq('interim text reported, no final yet', log.texts.at(-1), ['', 'roof twelve'])
  r.say([['roof 12 by 8', true]])
  eq('final text kept', log.texts.at(-1), ['roof 12 by 8', ''])
  r.say([['roof 12 by 8', true], ['walls', false]], 1)
  eq('next sentence is interim after the final', log.texts.at(-1), ['roof 12 by 8', 'walls'])
  r.say([['roof 12 by 8', true], ['walls 40 m2', true]], 1)
  eq('two finals are joined with one space', log.texts.at(-1), ['roof 12 by 8 walls 40 m2', ''])
  d.stop()
  ok('stop asks the browser to stop and not to restart', r.stopped === 1 && d.listening === false)
  r.onend()
  ok('onend after stop: listening off, no new recogniser, no error', log.listening.at(-1) === false && made.length === 1 && log.errors.length === 0)
}
{
  const { d, log } = mk()
  d.start()
  made[0].say([['roof', true]])
  made[0].onend() // browser ended the session early
  ok('auto-restart: a second recogniser is started while still wanted', made.length === 2 && made[1].started === 1 && log.listening.at(-1) === true)
  made[1].say([['walls', true]])
  eq('words from both sessions are kept', log.texts.at(-1), ['roof walls', ''])
  d.stop()
  made[1].onend()
  ok('after stop it does not restart again', made.length === 2)
}
{
  const { d, log } = mk()
  d.start()
  made[0].onerror({ error: 'not-allowed' })
  ok('denied: error blocked, listening off', log.errors[0] === 'blocked' && log.listening.at(-1) === false && d.listening === false)
  made[0].onend()
  ok('denied: the end that follows does not restart', made.length === 1)
}
{
  const { d, log } = mk()
  d.start()
  made[0].onerror({ error: 'no-speech' })
  made[0].onend()
  ok('no speech: stops quietly with the nospeech message', log.errors.join() === 'nospeech' && made.length === 1 && d.listening === false)
}
{
  const { d, log } = mk()
  d.start()
  made[0].onerror({ error: 'network' })
  ok('network error reported', log.errors[0] === 'network' && d.listening === false)
}
{
  const { d, log } = mk()
  d.start()
  made[0].onerror({ error: 'aborted' })
  ok('aborted is not shown as an error', log.errors.length === 0 && d.listening === true)
  d.stop()
}
{
  const { d, log } = mk({ maxIdleRestarts: 2 })
  d.start()
  for (let i = 0; i < 6 && d.listening; i++) made.at(-1).onend()
  ok('silence loop: gives up after a few restarts with nothing heard', log.errors.join() === 'nospeech' && made.length === 3, `${made.length} ${log.errors}`)
}
{
  made.length = 0
  const log = { errors: [], listening: [] }
  class Bad extends Fake {
    start() {
      throw new Error('not allowed')
    }
  }
  const d = S.createDictation({ ctor: Bad, onText() {}, onListening: (b) => log.listening.push(b), onError: (k) => log.errors.push(k) })
  d.start()
  ok('start() throws (page may not use the microphone): blocked message, not silent', log.errors[0] === 'blocked' && d.listening === false)
}
{
  const { d } = mk()
  d.start()
  d.start()
  ok('second start while listening does nothing', made.length === 1)
  d.stop()
}

console.log(`\n${pass} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)
