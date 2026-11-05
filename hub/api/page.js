// Vercel function for the Hub page: every path that is not a file and not under /api (vercel.json rewrite), so client side
// routes fall back to the page. Needs dist/app.html (vercel.json includeFiles).
import { fileURLToPath } from 'node:url'
import { makePage } from './_page.js'

const page = makePage(fileURLToPath(new URL('../dist/app.html', import.meta.url)))

export const GET = () => page()
export const HEAD = () => page()
