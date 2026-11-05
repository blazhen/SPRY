// After the Vite build on Vercel: rename dist/index.html to dist/app.html, so "/" is served by api/page.js (which adds the
// framing header from HUB_FRAME_ANCESTORS) instead of as a static file. Usage: node scripts/vercel-postbuild.mjs [outDir]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.resolve(root, process.argv[2] ?? 'dist')
const from = path.join(out, 'index.html')
if (!fs.existsSync(from)) {
  console.error('No index.html in ' + out + ': run the Vite build first.')
  process.exit(1)
}
fs.renameSync(from, path.join(out, 'app.html'))
console.log('dist ready: index.html is now app.html')
