// Proof for src/lib/layoutDraft.ts (the live editor session). Plain node: bundles the TS with esbuild, runs against a fake localStorage.
// Run: node scripts/proof-layoutdraft.mjs
import { build } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(mkdtempSync(join(tmpdir(), 'layoutdraft-')), 'bundle.mjs')
await build({
  stdin: {
    contents: "export * from './src/lib/layoutDraft'; export * from './src/lib/jobLayout'; export * from './src/lib/layoutEdit'",
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  logLevel: 'silent',
})

const store = new Map()
let writes = 0
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      writes++
      store.set(k, String(v))
    },
    removeItem: (k) => store.delete(k),
  },
}
const m = await import(pathToFileURL(out).href)
const S = () => m.getLayoutSession()

let pass = 0
let fail = 0
const ok = (cond, name) => {
  if (cond) pass++
  else {
    fail++
    console.log('FAIL: ' + name)
  }
}
const J = (x) => JSON.stringify(x)
const box = (l, id) => l.boxes.find((b) => b.id === id)

// idle state
ok(!S().editing && !S().canUndo && !S().canRedo && !S().dirty, 'idle flags')
ok(J(S().layout) === J(m.getJobLayout()), 'idle layout is the saved one')
S().apply((l) => m.moveToPanel(l, 'quotes', 'left'))
ok(J(S().layout) === J(m.getJobLayout()) && writes === 0, 'apply outside edit mode does nothing')

const saved0 = J(m.getJobLayout())
S().start()
ok(S().editing, 'start enters edit mode')

// apply moves a box
S().apply((l) => m.moveToPanel(l, 'quotes', 'left'))
ok(box(S().layout, 'quotes').panel === 'left', 'apply moves a box')
ok(S().canUndo && !S().canRedo && S().dirty, 'flags after apply')
ok(J(m.getJobLayout()) === saved0, 'saved layout untouched while editing')
ok(writes === 0, 'no localStorage write while editing')

// undo restores
S().undo()
ok(box(S().layout, 'quotes').panel === 'right', 'undo restores')
ok(!S().canUndo && S().canRedo && !S().dirty, 'flags after undo')

// redo reapplies
S().redo()
ok(box(S().layout, 'quotes').panel === 'left', 'redo reapplies')
ok(S().canUndo && !S().canRedo, 'flags after redo')

// new apply clears redo
S().undo()
ok(S().canRedo, 'redo available before new apply')
S().apply((l) => m.setHidden(l, 'pinned', true))
ok(!S().canRedo, 'new apply clears redo')
ok(box(S().layout, 'quotes').panel === 'right' && box(S().layout, 'pinned').hidden, 'new apply built on the undone state')
S().undo()

// no-op apply adds no history
const before = J(S().layout)
S().apply((l) => l)
S().apply((l) => ({ ...l, boxes: l.boxes.map((b) => ({ ...b })) }))
S().apply((l) => m.setHidden(l, 'job', false))
ok(!S().canUndo && J(S().layout) === before, 'no-op apply adds no history')

// hiding the last middle box is refused or repaired
let l0 = S().layout
for (const b of l0.boxes.filter((b) => b.panel === 'middle' && !b.hidden)) S().apply((l) => m.setHidden(l, b.id, true))
ok(S().layout.boxes.some((b) => b.panel === 'middle' && !b.hidden), 'last middle box cannot be hidden (setHidden)')
// force it with a raw edit: the engine must repair
S().apply((l) => ({ ...l, boxes: l.boxes.map((b) => (b.panel === 'middle' ? { ...b, hidden: true } : b)) }))
ok(S().layout.boxes.some((b) => b.panel === 'middle' && !b.hidden), 'raw hide of every middle box is repaired')
while (S().canUndo) S().undo()

// history cap
for (let i = 0; i < 130; i++) S().apply((l) => ({ ...l, swap: !l.swap }))
let steps = 0
while (S().canUndo) {
  S().undo()
  steps++
}
ok(steps === 100, 'history capped at 100 (got ' + steps + ')')
while (S().canRedo) S().redo()
while (S().canUndo) S().undo()

// reset is undoable
S().apply((l) => m.moveToPanel(l, 'quotes', 'left'))
S().reset()
ok(J(S().layout) === J(m.sanitize(m.defaultLayout())), 'reset puts the default in the draft')
S().undo()
ok(box(S().layout, 'quotes').panel === 'left', 'reset is undoable')
S().redo()
ok(J(S().layout) === J(m.sanitize(m.defaultLayout())), 'reset is redoable')

// cancel leaves saved untouched and nothing written
S().cancel()
ok(!S().editing && !S().canUndo, 'cancel leaves edit mode')
ok(J(m.getJobLayout()) === saved0, 'cancel leaves saved layout untouched')
ok(writes === 0 && store.size === 0, 'cancel wrote nothing to localStorage')
ok(J(S().layout) === saved0, 'after cancel layout is the saved one')

// restart after cancel starts clean
S().start()
ok(!S().canUndo && !S().canRedo && !S().dirty, 'new session starts with empty history')

// done writes exactly once
S().apply((l) => m.moveToPanel(l, 'quotes', 'left'))
S().apply((l) => m.setHidden(l, 'pinned', true))
S().apply((l) => m.moveWithin(l, 'people', 1))
ok(writes === 0, 'still no write before done')
const draft = J(S().layout)
S().done()
ok(writes === 1, 'done writes exactly once (writes=' + writes + ')')
ok(!S().editing, 'done leaves edit mode')
ok(J(m.getJobLayout()) === draft && box(m.getJobLayout(), 'quotes').panel === 'left', 'done saved the draft')
ok(J(S().layout) === draft, 'session layout is the saved one after done')
const stored = JSON.parse(store.get('hub.job.layout.v2.advanced'))
ok(box(stored, 'quotes').panel === 'left', 'stored value is the draft')

// methods are no-ops when not editing
S().undo()
S().redo()
S().done()
S().cancel()
ok(writes === 1, 'no stray writes outside edit mode')

console.log(fail === 0 ? `ALL PASS (${pass} checks)` : `${fail} FAILED, ${pass} passed`)
process.exit(fail === 0 ? 0 : 1)
