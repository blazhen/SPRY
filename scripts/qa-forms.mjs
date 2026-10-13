/**
 * Form checks against a finished build. Nothing real is contacted: the lead
 * webhook and the booking calendar are fake addresses answered inside the
 * browser, and every other outside request is blocked.
 *
 *   quote form   empty submit, bad values, focus and ARIA on errors, the
 *                unconfigured message, a good submit (payload checked), the
 *                honeypot, the too-fast guard, a failing server
 *   thank-you    both confirmation pages
 *   booking      call panel when unconfigured, embedded calendar when set
 *
 * Usage: node scripts/qa-forms.mjs        Exit code 1 if any check fails.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const server = await preview({ root: ROOT, logLevel: 'silent', preview: { host: '127.0.0.1', port: 4185, strictPort: false } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
let browser
for (const o of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) { try { browser = await chromium.launch({ headless: true, ...o }); break } catch {} }

let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ': ' + detail : ''}`)
  if (!ok) failed += 1
}
const HOOK = 'https://example.invalid/hook'
const CAL = 'https://example.invalid/calendar'

/** A page where config.js is rewritten, and every non-local request is held back. */
async function open(url, { webhook = '', calendar = '', hookStatus = 200 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const posts = []
  const outside = []
  await page.route('**/*', async (route) => {
    const u = route.request().url()
    if (u.startsWith(base)) {
      if (u.endsWith('/config.js')) {
        const res = await route.fetch()
        let body = await res.text()
        if (webhook) body = body.replace("'__LEAD_WEBHOOK__'", `'${webhook}'`)
        if (calendar) body = body.replace("'__BOOKING_CALENDAR_URL__'", `'${calendar}'`)
        return route.fulfill({ response: res, body })
      }
      return route.continue()
    }
    if (u.startsWith(HOOK)) {
      if (route.request().method() === 'POST') posts.push(JSON.parse(route.request().postData() || '{}'))
      return route.fulfill({ status: hookStatus, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: '{}' })
    }
    if (u.startsWith(CAL)) return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>calendar</p>' })
    outside.push(u)
    return route.abort()
  })
  await page.goto(base + url, { waitUntil: 'load' })
  await page.waitForFunction(() => !document.getElementById('boot'), undefined, { timeout: 20_000 }).catch(() => {})
  return { page, context, posts, outside }
}

const fill = async (page, values) => {
  for (const [name, v] of Object.entries(values)) {
    if (name === 'propertyType' || name === 'heardFrom') await page.selectOption(`[name="${name}"]`, { index: 1 })
    else await page.fill(`[name="${name}"]`, v)
  }
}
const GOOD = { firstName: 'Test', lastName: 'Person', phone: '0400 000 000', email: 'test@example.com', postcode: '3201', propertyType: '', heardFrom: '' }
const firstArea = (page) => page.locator('fieldset[data-field="areas"] button').first().click()

/* ------------------------------------------------------------ quote form */
console.log('\n== Quote form, nothing configured')
{
  const { page, context, posts, outside } = await open('/contact-us/')
  await page.waitForTimeout(3300) // past the too-fast guard
  await page.getByRole('button', { name: /get my free quote|send|submit|request/i }).last().click()
  await page.waitForTimeout(500)
  const errs = await page.locator('[id$="-error"]').allTextContents()
  check(errs.length === 8, 'empty submit shows one error per required field', `${errs.length} errors`)
  const focus = await page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('name'))
  check(focus === 'firstName', 'focus moves to the first problem', String(focus))
  const wired = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-invalid="true"]')].every((el) => document.getElementById(el.getAttribute('aria-describedby'))),
  )
  check(wired, 'every invalid field points at its error message (aria-describedby)')

  await fill(page, { firstName: 'A', lastName: 'B', phone: '12345', email: 'nope', postcode: '12' })
  await page.getByRole('button', { name: /get my free quote|send|submit|request/i }).last().click()
  await page.waitForTimeout(300)
  const text = (await page.locator('[id$="-error"]').allTextContents()).join(' | ')
  check(/Australian number/.test(text), 'bad phone number is rejected with a clear message')
  check(/check that email/.test(text), 'bad email is rejected with a clear message')
  check(/four digit postcode/.test(text), 'bad postcode is rejected with a clear message')

  await fill(page, GOOD)
  await firstArea(page)
  await page.getByRole('button', { name: /get my free quote|send|submit|request/i }).last().click()
  await page.waitForTimeout(600)
  const alert = await page.getByRole('alert').first().textContent().catch(() => '')
  check(/1300 177 729/.test(alert ?? ''), 'unconfigured: a visible error with the phone number, never a fake success', (alert ?? '').slice(0, 90))
  check(!/\/thanks\//.test(page.url()), 'unconfigured: stays on the form')
  check(posts.length === 0, 'unconfigured: nothing was posted')
  check(outside.every((u) => !/example\.invalid/.test(u)), 'no request left the page to a fake host')
  await context.close()
}

console.log('\n== Quote form, webhook set (fake, intercepted)')
{
  const { page, context, posts } = await open('/contact-us/', { webhook: HOOK })
  await page.waitForTimeout(3300)
  await fill(page, GOOD)
  await firstArea(page)
  await page.getByRole('button', { name: /get my free quote|send|submit|request/i }).last().click()
  await page.waitForURL('**/thanks/quote/', { timeout: 8000 }).catch(() => {})
  check(/\/thanks\/quote\/$/.test(page.url()), 'good submit goes to the thank-you page', page.url().replace(base, ''))
  check(posts.length === 1, 'exactly one POST was made', String(posts.length))
  const p = posts[0] ?? {}
  check(p.first_name === undefined && p.firstName === 'Test' && p.lastName === 'Person', 'first and last name sent separately')
  check(p.phone === '+61400000000', 'phone normalised to +61 format', String(p.phone))
  check(p.consent_marketing === 'no', 'marketing consent defaults to "no" when unticked', String(p.consent_marketing))
  check(typeof p.consent_text === 'string' && p.consent_text.length > 20, 'the consent wording travels with the record')
  check(p.source === 'website' && p.form === 'quote_request', 'source and form tags are set')
  check(!('consentText' in p) && !('heardFrom' in p) && p.heard_from, 'no duplicate camelCase fields (heard_from only)')
  await context.close()
}
{
  const { page, context, posts } = await open('/contact-us/', { webhook: HOOK })
  await page.waitForTimeout(3300)
  await fill(page, GOOD)
  await firstArea(page)
  await page.locator('input[type="checkbox"]').check()
  await page.getByRole('button', { name: /get my free quote|send|submit|request/i }).last().click()
  await page.waitForURL('**/thanks/quote/', { timeout: 8000 }).catch(() => {})
  check(posts[0]?.consent_marketing === 'yes', 'ticking the box sends consent "yes"')
  await context.close()
}
{
  const { page, context, posts } = await open('/contact-us/', { webhook: HOOK })
  await page.waitForTimeout(3300)
  await fill(page, GOOD)
  await firstArea(page)
  await page.evaluate(() => { document.getElementById('company_website').value = 'http://spam.example' })
  await page.getByRole('button', { name: /get my free quote|send|submit|request/i }).last().click()
  await page.waitForURL('**/thanks/quote/', { timeout: 8000 }).catch(() => {})
  check(posts.length === 0, 'honeypot filled: nothing is posted (bot sees a normal thank-you)')
  await context.close()
}
{
  const { page, context, posts } = await open('/contact-us/', { webhook: HOOK })
  await fill(page, GOOD)
  await firstArea(page)
  await page.getByRole('button', { name: /get my free quote|send|submit|request/i }).last().click()
  await page.waitForTimeout(400)
  const alert = await page.getByRole('alert').first().textContent().catch(() => '')
  check(/little quick/.test(alert ?? '') && posts.length === 0, 'submitting within 3 seconds is held back with a polite message')
  await context.close()
}
{
  const { page, context } = await open('/contact-us/', { webhook: HOOK, hookStatus: 500 })
  await page.waitForTimeout(3300)
  await fill(page, GOOD)
  await firstArea(page)
  await page.getByRole('button', { name: /get my free quote|send|submit|request/i }).last().click()
  await page.waitForTimeout(800)
  const alert = await page.getByRole('alert').first().textContent().catch(() => '')
  check(!!alert && !/\/thanks\//.test(page.url()), 'server error: visitor is told, not sent to a false thank-you', (alert ?? '').slice(0, 80))
  await context.close()
}

/* ------------------------------------------------------------- thank you */
console.log('\n== Thank-you pages')
for (const url of ['/thanks/quote/', '/thanks/booked/']) {
  const { page, context } = await open(url)
  const h1 = await page.locator('h1').first().textContent()
  const robots = await page.locator('meta[name="robots"]').first().getAttribute('content')
  check(!!h1 && /noindex/.test(robots ?? ''), `${url} shows its heading and is noindex`, h1?.trim())
  await context.close()
}

/* --------------------------------------------------------------- booking */
console.log('\n== Booking page')
{
  const { page, context } = await open('/book/')
  const frames = await page.locator('iframe').count()
  const tel = await page.locator('a[href^="tel:"]').count()
  check(frames === 0 && tel > 0, 'calendar not set: a call panel, no empty frame', `${frames} iframes, ${tel} phone links`)
  await context.close()
}
{
  const { page, context } = await open('/book/', { calendar: CAL })
  await page.waitForTimeout(800)
  const src = await page.locator('iframe').first().getAttribute('src').catch(() => null)
  check(!!src && src.startsWith(CAL), 'calendar set: it is embedded', String(src))
  await context.close()
}

await browser.close()
if (typeof server.close === 'function') await server.close()
else server.httpServer.close()
console.log(failed ? `\nFAIL (${failed})` : '\nPASS')
process.exit(failed ? 1 : 0)
