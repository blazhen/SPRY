// Unit check for dropTarget (components/live/useBoxDrag.tsx). Bundles the real file with esbuild (css and app imports stubbed).
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'scripts', '.tmp-dragmath.mjs')
await build({
  entryPoints: [resolve(root, 'src/components/live/useBoxDrag.tsx')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  external: ['react'],
  loader: { '.css': 'empty' },
  logLevel: 'silent',
})
const { dropTarget } = await import(pathToFileURL(out).href)

let pass = 0
let fail = 0
const ok = (name, cond) => {
  if (cond) pass++
  else {
    fail++
    console.log('FAIL', name)
  }
}
const panels = [
  { id: 'left', left: 0, right: 100, top: 0, bottom: 500, frames: [{ id: 'a', top: 10, bottom: 110 }, { id: 'b', top: 120, bottom: 220 }, { id: 'c', top: 230, bottom: 330 }] },
  { id: 'middle', left: 110, right: 210, top: 0, bottom: 500, frames: [] },
]
let t = dropTarget({ x: 50, y: 20 }, panels)
ok('above midpoint of first', t && t.panel === 'left' && t.index === 0 && t.beforeId === 'a')
t = dropTarget({ x: 50, y: 100 }, panels)
ok('below midpoint of first', t && t.index === 1 && t.beforeId === 'b')
t = dropTarget({ x: 50, y: 400 }, panels)
ok('below all', t && t.index === 3 && t.beforeId === undefined)
t = dropTarget({ x: 150, y: 300 }, panels)
ok('empty panel', t && t.panel === 'middle' && t.index === 0 && t.beforeId === undefined)
t = dropTarget({ x: 50, y: 100 }, panels, 'a')
ok('excluded dragged box: pointer over it lands at 0', t && t.index === 0 && t.beforeId === 'b')
t = dropTarget({ x: 50, y: 250 }, panels, 'b')
ok('excluded box shifts index', t && t.index === 1 && t.beforeId === 'c')
ok('outside every panel is null', dropTarget({ x: 105, y: 50 }, panels) === null && dropTarget({ x: 50, y: 600 }, panels) === null)
t = dropTarget({ x: 50, y: 20 }, panels)
ok('line above first frame', t && t.lineY < 10)
t = dropTarget({ x: 50, y: 400 }, panels)
ok('line below last frame', t && t.lineY > 330)

console.log(fail === 0 ? `ALL PASS (${pass} checks, real file bundled with esbuild)` : `${fail} FAILED, ${pass} passed`)
process.exit(fail ? 1 : 0)
