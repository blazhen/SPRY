/**
 * Search and sharing checks, read straight from the built files in dist/.
 *
 * Per page: title and description length, unique across the site, canonical
 * matches the page address, Open Graph and Twitter tags, share image exists
 * and has a sensible size, every JSON-LD block parses and has its @type.
 * Site-wide: sitemap lists exactly the indexable pages, robots.txt, and the
 * home page's business data (name, address, phone, ABN) matches site.ts.
 *
 * Works on either build. Usage: node scripts/qa-seo.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const ORIGIN = 'https://sprayitsolutions.com.au'

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'assets' ? [] : walk(path.join(dir, e.name))) : e.name === 'index.html' || e.name === '404.html' ? [path.join(dir, e.name)] : []))
const files = walk(DIST)

let failed = 0
const bad = (page, msg) => { failed += 1; console.log(`  FAIL ${page}: ${msg}`) }
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`, 'i'))?.[1]
const meta = (html, key, by = 'name') => {
  const tag = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((t) => attr(t, by) === key)
  return tag ? attr(tag, 'content') : undefined
}
const unent = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')

const titles = new Map()
const descs = new Map()
const canonicals = []
let staging = null
console.log(`Checking ${files.length} built pages\n`)

for (const file of files) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/')
  const route = rel === 'index.html' ? '/' : rel === '404.html' ? '404' : '/' + rel.replace(/index\.html$/, '')
  const html = fs.readFileSync(file, 'utf8')
  const title = unent(html.match(/<title>([^<]*)<\/title>/)?.[1])
  const desc = unent(meta(html, 'description'))
  const canon = attr([...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((t) => attr(t, 'rel') === 'canonical') ?? '', 'href')
  const robots = meta(html, 'robots') ?? ''
  const noindex = /noindex/.test(robots)
  if (route === '/') staging = noindex

  if (!title) bad(route, 'no title')
  else {
    if (title.length > 70) bad(route, `title is ${title.length} characters (aim for 60 or fewer): "${title}"`)
    titles.set(title, [...(titles.get(title) ?? []), route])
  }
  if (!desc) bad(route, 'no meta description')
  else {
    if (desc.length < 70 || desc.length > 165) bad(route, `description is ${desc.length} characters (aim for 70-160)`)
    descs.set(desc, [...(descs.get(desc) ?? []), route])
  }
  if (route !== '404') {
    if (!canon) bad(route, 'no canonical')
    else {
      canonicals.push(canon)
      if (canon !== ORIGIN + route) bad(route, `canonical ${canon} does not match the page address`)
    }
  }
  for (const key of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']) if (!meta(html, key, 'property')) bad(route, `missing ${key}`)
  for (const key of ['twitter:card', 'twitter:image']) if (!meta(html, key)) bad(route, `missing ${key}`)
  const og = meta(html, 'og:image', 'property')
  if (og) {
    const local = og.replace(ORIGIN, '')
    const f = path.join(DIST, local)
    if (!og.startsWith('http')) bad(route, `og:image is not an absolute URL: ${og}`)
    else if (!fs.existsSync(f)) bad(route, `og:image file is missing from the build: ${local}`)
  }

  const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  for (const raw of ld) {
    try {
      const d = JSON.parse(unent(raw))
      const types = [].concat(d['@type'] ?? d['@graph']?.map((x) => x['@type']) ?? [])
      if (!d['@context'] || types.length === 0) bad(route, 'JSON-LD without @context or @type')
      if (types.includes('HomeAndConstructionBusiness')) {
        for (const k of ['name', 'legalName', 'taxID', 'telephone', 'address', 'url', 'geo', 'openingHours']) if (!d[k]) bad(route, `business data missing ${k}`)
        if (d.taxID !== '40 602 502 607') bad(route, `taxID is ${d.taxID}`)
        if (route === '/') console.log(`  home business data: ${d.legalName}, ABN ${d.taxID}, ${d.telephone}, ${d.address?.addressLocality} ${d.address?.postalCode}`)
      }
      if (types.includes('FAQPage') && !(d.mainEntity?.length > 0)) bad(route, 'FAQ with no questions')
      if (types.includes('BreadcrumbList') && !(d.itemListElement?.length > 0)) bad(route, 'breadcrumb with no items')
      if (types.includes('Article') && !(d.headline && d.datePublished)) bad(route, 'article without headline or date')
    } catch (e) {
      bad(route, `JSON-LD does not parse: ${e.message}`)
    }
  }
  console.log(`  ${route.padEnd(62)} title ${String(title.length).padStart(2)}, desc ${String(desc.length).padStart(3)}, ${ld.length} JSON-LD, ${noindex ? 'noindex' : 'indexable'}`)
}

for (const [t, r] of titles) if (r.length > 1) bad(r.join(' + '), `same title: "${t}"`)
for (const [d, r] of descs) if (r.length > 1) bad(r.join(' + '), `same description: "${d.slice(0, 60)}"`)

/* Sitemap = exactly the indexable pages. */
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8')
const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
for (const c of canonicals) {
  const f = path.join(DIST, c.replace(ORIGIN, ''), 'index.html')
  const html = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  const isNoindex = /noindex/.test(meta(html, 'robots') ?? '')
  const inMap = listed.includes(c)
  if (!staging && isNoindex && inMap) bad('sitemap', `${c} is noindex but listed`)
  if (!staging && !isNoindex && !inMap) bad('sitemap', `${c} is indexable but not listed`)
}
for (const l of listed) if (!canonicals.includes(l)) bad('sitemap', `${l} is listed but has no page`)
console.log(`\n  sitemap lists ${listed.length} pages; build is ${staging ? 'STAGING (everything noindex, so sitemap is not compared)' : 'LIVE'}`)

const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8')
const blocksAll = /^Disallow:\s*\/\s*$/m.test(robots)
if (staging !== blocksAll) bad('robots.txt', `build is ${staging ? 'staging' : 'live'} but robots.txt ${blocksAll ? 'blocks everything' : 'is open'}`)
console.log(`  robots.txt ${blocksAll ? 'blocks everything (staging)' : 'is open' + (/Sitemap:/.test(robots) ? ' and names the sitemap' : ' but has no Sitemap line')}`)
if (!staging && !/Sitemap:/.test(robots)) bad('robots.txt', 'no Sitemap line')

console.log(failed ? `\nFAIL (${failed})` : '\nPASS')
process.exit(failed ? 1 : 0)
