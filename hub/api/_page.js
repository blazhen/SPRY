// The Hub page itself, served by a function so the framing rule can come from a host setting (vercel.json headers cannot
// read env vars). The built page is dist/app.html (scripts/vercel-postbuild.mjs renames index.html, so "/" is not a static file).
// Assets (/assets/*, favicon) stay static. Framing: no X-Frame-Options header at all; Content-Security-Policy frame-ancestors
// is 'self' plus HUB_FRAME_ANCESTORS (see server/lib/frame.ts).
import fs from 'node:fs'
import { frameAncestorsPolicy } from '../server/.build/lib/frame.js'

export function makePage(htmlFile) {
  let html = null
  const page = () => {
    if (html === null) {
      try {
        html = fs.readFileSync(htmlFile, 'utf8')
      } catch {
        return new Response('The Hub page is not built.', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      }
    }
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Content-Security-Policy': frameAncestorsPolicy(process.env.HUB_FRAME_ANCESTORS),
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  }
  return page
}
