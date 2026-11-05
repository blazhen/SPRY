// Runs the older proof scripts that touch the job page, one after another, and prints one line each.
// Run: node scripts/run-photos-regression.mjs   (mock build in dist-ph, live build in dist-phlive)
import { spawnSync } from 'node:child_process'
const jobs = [
  ['proof-round7', 'dist-ph'], ['proof-round8-focus', 'dist-ph'], ['proof-round8-s5', 'dist-ph'], ['proof-round8-s2', 'dist-ph'],
  ['proof-round9-menu', 'dist-ph'], ['proof-round8-headers', 'dist-ph'], ['proof-round8-clicks', 'dist-ph'], ['proof-round5', 'dist-ph'],
  ['proof-round10-stepper', 'dist-ph'], ['proof-round8-foam', 'dist-ph'], ['proof-files-live', 'dist-phlive'], ['check-extras-unit', ''], ['check-pdfdoc-unit', ''],
]
for (const [name, dist] of jobs) {
  const r = spawnSync(process.execPath, [`scripts/${name}.mjs`], { env: { ...process.env, ...(dist ? { HUB_DIST: dist } : {}) }, encoding: 'utf8', timeout: 400000 })
  const out = (r.stdout || '') + (r.stderr || '')
  const pass = (out.match(/^PASS/gm) || []).length
  const failLines = out.split('\n').filter((l) => /^FAIL/.test(l)).slice(0, 4)
  console.log(`${name}: ${pass} PASS, ${failLines.length ? 'FAIL ' : '0 FAIL'} exit ${r.status}`)
  failLines.forEach((l) => console.log('   ' + l.slice(0, 200)))
}
