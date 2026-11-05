// Round 6: runs the older check scripts one after another against HUB_DIST and prints a pass/fail line for each.
import { spawnSync } from 'node:child_process'
const names = ['check', 'check2', 'check-hub', 'check-final', 'check-invoice-edit', 'check-invoices-list', 'check-public-quote', 'check-search', 'check-stages', 'check-status-notes', 'check-sticky', 'check-sync']
for (const n of names) {
  const r = spawnSync(process.execPath, [`scripts/${n}.mjs`], { encoding: 'utf8', env: { ...process.env, HUB_DIST: 'dist-ais' }, timeout: 600000 })
  const out = (r.stdout || '') + (r.stderr || '')
  const fails = out.split('\n').filter((l) => /^\s*(FAIL|✗|✘)|FAILED/.test(l))
  console.log(`${n}: exit ${r.status}, fail lines ${fails.length}${fails.length ? ' :: ' + fails.slice(0, 3).join(' | ') : ''}`)
}
