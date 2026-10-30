// Usage: node scripts/check-stages.mjs
// Bundles src/lib/stageCheck.ts with esbuild, runs it in Node with a fake localStorage, and also checks that
// saved data in the old 7-stage names loads onto the new stages. No browser, no server.
import { build } from 'esbuild'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hub-stages-')), 'bundle.mjs')

fs.writeFileSync(
  path.join(path.dirname(out), 'entry.ts'),
  `export { stageSelfCheck } from ${JSON.stringify(path.join(ROOT, 'src/lib/stageCheck.ts').replace(/\\/g, '/'))}\nexport { getJob } from ${JSON.stringify(path.join(ROOT, 'src/lib/store.ts').replace(/\\/g, '/'))}\n`,
)
await build({
  entryPoints: [path.join(path.dirname(out), 'entry.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'error',
  nodePaths: [path.join(ROOT, 'node_modules')],
  define: { 'import.meta.env': '{}' },
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
})

// Fake browser storage, pre-filled with jobs saved by the old Hub (v2 keys, old stage names).
const mem = new Map()
const oldJob = (id, stage) => ({ id, name: id, address: '', source: '', value: 1, ownerId: 'glenn', stage, participants: [], tasks: [], appointments: [] })
mem.set('hub.jobs.v2', JSON.stringify([oldJob('o1', 'Won'), oldJob('o2', 'Lost'), oldJob('o3', 'Site visit'), oldJob('o4', 'Quote sent'), oldJob('o5', 'New lead'), oldJob('o6', 'Quote accepted'), oldJob('o7', 'Quoting'), oldJob('o8', 'Nonsense')]))
globalThis.window = {
  localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k) },
  location: { search: '', hash: '' },
  addEventListener() {},
}

let failed = 0
const rec = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`)
}

const mod = await import(pathToFileURL(out).href)
const want = {
  o1: ['Job Booked', 'won'],
  o2: ['Quote Sent', 'lost'],
  o3: ['Inspection Required', 'open'],
  o4: ['Quote Sent', 'open'],
  o5: ['New Lead', 'open'],
  o6: ['Quote Accepted', 'open'],
  o7: ['Quoting', 'open'],
  o8: ['New Lead', 'open'],
}
for (const [id, [stage, status]] of Object.entries(want)) {
  const j = mod.getJob(id)
  rec(`old save ${id} loads as ${stage} / ${status}`, j?.stage === stage && j?.status === status, j ? `${j.stage} / ${j.status}` : 'missing')
}

const r = mod.stageSelfCheck()
rec(`stageSelfCheck (${r.failures.length} failures)`, r.ok, r.failures.join(' | '))
fs.rmSync(path.dirname(out), { recursive: true, force: true })
console.log(failed ? `${failed} FAILED` : 'ALL PASS')
process.exit(failed ? 1 : 0)
