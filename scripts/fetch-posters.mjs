/**
 * Saves local copies of the YouTube poster frames into public/posters/.
 *
 * The site never requests thumbnails from i.ytimg.com at runtime: that host is
 * a third party and failed intermittently for visitors. Run this once (and
 * again whenever a video is added to src/data/videos.ts), then commit the
 * files in public/posters/ with the build.
 *
 * Usage: node scripts/fetch-posters.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'posters')
fs.mkdirSync(OUT, { recursive: true })

/** Each video's `id` and verified `poster` name, read from src/data/videos.ts. */
const source = fs.readFileSync(path.join(ROOT, 'src/data/videos.ts'), 'utf8')
const entries = [...source.matchAll(/id:\s*'([\w-]{11})'[\s\S]*?poster:\s*'(\w+)'/g)].map((m) => ({
  id: m[1],
  poster: m[2],
}))
if (entries.length < 10) throw new Error(`Read only ${entries.length} videos from src/data/videos.ts`)

/** Frames used as slide and card images (yt('ID') in sectors.ts and features.ts) that are not in the video list. */
for (const file of ['src/data/sectors.ts', 'src/data/features.ts']) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  for (const m of text.matchAll(/\byt\('([\w-]{11})'\)/g)) {
    if (!entries.some((e) => e.id === m[1])) entries.push({ id: m[1], poster: 'hqdefault' })
  }
}

async function get(id, name) {
  const res = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`)
  if (!res.ok) return null
  const bytes = Buffer.from(await res.arrayBuffer())
  // A missing rendition comes back as a ~1 KB grey placeholder with a 200.
  return bytes.length > 8000 ? bytes : null
}

let failed = 0
for (const { id, poster } of entries) {
  const bytes = (await get(id, poster)) ?? (await get(id, 'hqdefault'))
  if (!bytes) {
    console.log(`FAIL  ${id}`)
    failed += 1
    continue
  }
  fs.writeFileSync(path.join(OUT, `${id}.jpg`), bytes)
  console.log(` ok   ${id}.jpg  ${Math.round(bytes.length / 1024)} KB`)
}
process.exit(failed ? 1 : 0)
