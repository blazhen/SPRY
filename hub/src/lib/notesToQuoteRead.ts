// Inspection notes to quote: step 1, READING the notes (rule based, no AI, no network).
// Pure functions only (no store, no React), so scripts/check-notes-to-quote.mjs can test them on their own.
// The reader turns free text into plain facts: which part of the building, how many m2, thickness, foam, R-value, what
// was left out, access notes, extras. It never prices anything: pricing is notesToQuote.ts. A model reader can replace
// this one later (same output shape, see HUB-NOTES-TO-QUOTE-PROPOSAL.md).
//
// How it reads (in short): the text is tidied (lower case, number words to digits), cut into sentences, and each
// sentence is scanned for clauses it understands (what is left out, extras, access, storeys), then for sizes,
// thickness, foam, R-value, parts of the building (roof, walls, ceiling, sub-floor) and places (garage, shed...).
// Those are grouped left to right: "roof 12 x 8 closed cell 100mm walls 40 m2" gives two groups.

export type Part = 'roof' | 'walls' | 'ceiling' | 'subfloor' | 'unknown'
export type Foam = 'open' | 'closed'

export const PART_LABEL: Record<Part, string> = { roof: 'Roof', walls: 'Walls', ceiling: 'Ceiling', subfloor: 'Sub-floor', unknown: 'Area' }

/** One measured piece of a part, for example "bed 1 3 x 4" = 12 m2. */
export interface Piece {
  text: string
  m2: number
}

export interface ReadItem {
  id: string
  part: Part
  /** Place words in the notes ("garage", "bed 1"), lower case. */
  places: string[]
  /** m2 in total, or null when the notes name the part but give no size. */
  areaM2: number | null
  pieces: Piece[]
  thicknessMm?: number
  foam?: Foam
  rValue?: number
  /** "about", "approx", "ish" was said near the size. */
  approx?: boolean
  /** The part was taken from the line before, not said here. */
  partGuessed?: boolean
  /** The size had no unit ("roof 60"), so m2 was assumed. */
  noUnit?: boolean
  /** The words that left this out ("not the garage"). Left-out items are listed but not priced. */
  excluded?: string
  /** A thickness range was given ("100 to 150 mm"): the first and second number. */
  thicknessRange?: [number, number]
  /** The words in the notes this came from (tidied). */
  phrase: string
  /** The whole sentence it sat in (tidied): used to pick between price list items (new build, top up). */
  context?: string
}

export type ExtraKind = 'removeBatts' | 'skipBin' | 'masking' | 'fireCoating' | 'edgeSealing' | 'accessTime'

export interface ReadExtra {
  id: string
  kind: ExtraKind
  phrase: string
  /** m2 for removal and coating, hours for access time, null when the notes give none. */
  qty: number | null
}

export interface ReadNote {
  text: string
  phrase: string
}

export interface ReadResult {
  items: ReadItem[]
  extras: ReadExtra[]
  storeys?: { count: number; phrase: string }
  /** Access remarks ("tight access", "no power"). Nothing is priced from them. */
  access: ReadNote[]
  /** What is not part of the job ("not the garage"). */
  exclusions: ReadNote[]
  /** Totals the notes quoted ("120 m2 in total"). Never added as a line. */
  totals: { m2: number; phrase: string }[]
  /** Sentences that gave nothing the reader knows. */
  leftovers: string[]
  /** Numbers in a sentence that were not used. */
  unusedNumbers: { value: string; phrase: string }[]
}

// ---- Tidying ------------------------------------------------------------------

const ONES: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 }
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }
const ONES_RE = Object.keys(ONES).filter((w) => w !== 'zero').join('|')
const TENS_RE = Object.keys(TENS).join('|')
const BELOW_100 = `(?:(?:${TENS_RE})(?:[-\\s]+(?:${ONES_RE}))?|${ONES_RE})`
const NUMBER_WORDS = new RegExp(`\\b(?:(?:a|${BELOW_100})\\s+hundred(?:\\s+(?:and\\s+)?${BELOW_100})?|${BELOW_100})\\b`, 'g')

function wordsToValue(s: string): number {
  let total = 0
  let cur = 0
  for (const w of s.split(/[-\s]+/)) {
    if (w === 'and' || w === 'a') continue
    if (w === 'hundred') cur = (cur || 1) * 100
    else cur += ONES[w] ?? TENS[w] ?? 0
  }
  return total + cur
}

/** Lower case, number words as digits, "point" and "and a half" as decimals, dictation filler removed. */
export function tidy(raw: string): string {
  let t = raw.replace(/\r/g, '\n').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').toLowerCase()
  t = t.replace(/×/g, ' x ').replace(/m²/g, ' m2 ').replace(/ft²/g, ' ft2 ').replace(/½/g, '.5')
  t = t.replace(/\b(approx|apx|appx|est|incl|excl|sq|ca|mtr|mtrs)\./g, '$1')
  t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2')
  t = t.replace(NUMBER_WORDS, (m) => String(wordsToValue(m)))
  t = t.replace(/(\d+)\s+point\s+(\d+)/g, '$1.$2').replace(/(\d+)\s+and a half\b/g, '$1.5')
  t = t.replace(/\b(?:um+|uh+|ah+|erm+|er|you know|i mean|basically)\b/g, ' ')
  // "ground floor" and "first floor" are levels of the house, not the sub-floor.
  t = t.replace(/\b(?:ground|lower|1st)[\s-]?(?:floor|level)\b/g, 'downstairs').replace(/\b(?:first|second|top|upper|2nd)[\s-]?(?:floor|level)\b/g, 'upstairs')
  t = t.replace(/\b([a-z]{2,})(\s+\1\b)+/g, '$1')
  return t
}

/** Sentences: new line, semicolon, or a full stop followed by a space. Decimals keep their point. List bullets are dropped. */
export function sentences(tidyText: string): string[] {
  return tidyText
    .replace(/\.(?=\s|$)/g, '\n')
    .split(/\n+|;/)
    .map((s) => s.replace(/^\s*(?:[-*•]+|\d+[).])\s+/, '').replace(/\s+/g, ' ').trim())
    .filter((s) => /[a-z0-9]/.test(s))
}

// ---- Patterns -----------------------------------------------------------------

const NUM = '(\\d+(?:\\.\\d+)?)'
const MU = '(?:\\s*(?:m|mtrs?|metres?|meters?)\\b)?'
const SEP = '\\s*(?:x|by|\\*|times)\\s*'
const AREA_UNIT = '(?:m2|m\\^2|sqm|sq\\.?\\s?m(?:etres?|eters?|trs?)?|square\\s*(?:metres?|meters?|m|mtrs?)|(?:metres?|meters?)\\s*(?:squared|sq)|mtr2|m\\s?sq|msq)'
const DIMS3 = new RegExp(`${NUM}${MU}${SEP}${NUM}${MU}${SEP}${NUM}${MU}(?!\\s*(?:mm|cm)\\b)`, 'g')
const LONGHIGH = new RegExp(`${NUM}${MU}\\s*(?:long|length|wide|width|across)\\s*(?:x|by|and|,)?\\s*${NUM}${MU}\\s*(?:high|tall|height|wide|width|deep)`, 'g')
const DIMS2 = new RegExp(`${NUM}${MU}${SEP}${NUM}${MU}(?:\\s*${AREA_UNIT}(?![a-z0-9]))?(?!\\s*(?:mm|cm)\\b)(?![\\d.]*\\d)`, 'g')
const M2 = new RegExp(`${NUM}(ish)?\\s*${AREA_UNIT}(?![a-z0-9])`, 'g')
const FT2 = new RegExp(`${NUM}\\s*(?:sq\\.?\\s?f(?:ee|oo)?t|square\\s*f(?:ee|oo)t|ft2)\\b`, 'g')
const TIMBER = /^\s*(?:studs?|timber|framing|joists?|rafters?|noggins?|battens?|purlins?|beams?|posts?|pine|hardwood|centres|centers)/

const THICK_MM = new RegExp(`${NUM}\\s*(?:-|to)\\s*${NUM}\\s*(?:mm|mils?|millimet(?:re|er)s?)\\b|${NUM}\\s*(?:mm|mils?|millimet(?:re|er)s?)\\b`, 'g')
const THICK_CM = new RegExp(`${NUM}\\s*cm\\b`, 'g')
const THICK_IN = new RegExp(`${NUM}\\s*(?:inch(?:es)?|in\\b|")`, 'g')
const RVALUE = /\br[\s-]?value\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)|\br[\s-]?(\d+(?:\.\d+)?)\b/g
const CLOSED = /\bclosed[\s-]?cell\b|\bcc\b|\b2\s?-?\s?(?:lb|pound)s?\b|\bhard foam\b/g
const OPEN = /\bopen[\s-]?cell\b|\boc\b|\bhalf[\s-]?(?:lb|pound)s?\b|\b0?\.5\s?-?\s?(?:lb|pound)s?\b|\bsoft foam\b/g

const PART_RES: { part: Part; re: RegExp }[] = [
  { part: 'subfloor', re: /\b(?:sub[\s-]?floors?|under[\s-]?floors?|underfloor|floor(?:s|ing)?(?!\s*(?:area|plan|space|level|polish|joists?)))\b/g },
  { part: 'ceiling', re: /\b(?:ceilings?(?:\s+(?:cavity|cavities|void|space))?|attic|loft)\b/g },
  { part: 'roof', re: /\b(?:roofs?(?:\s+(?:cavity|cavities|void|space))?|roofing|roofspace|skillion|rafters?|under[\s-]?roof|roof\s?deck|sarking)\b/g },
  { part: 'walls', re: /\b(?:walls?(?:\s+cavit(?:y|ies))?|gables?(?:\s+ends?)?|stud\s?walls?|cladding)\b/g },
]

const BUILDING_PLACES = /\b(garage|shed|extension|granny flat|studio|workshop|carport|patio|pergola|verandah|veranda|upstairs|downstairs|alfresco|main house|annex|annexe|pool house|barn)\b/g
const ROOM_PLACES = /\b(?:(bed(?:room)?s?)(?:\s*(\d))?|(kitchen|living(?:\s+room)?|lounge|bathroom|laundry|hallway|hall|office|dining|study|master|ensuite|toilet)|(front|rear|back|left|right|side|north|south|east|west)(?=\s+(?:of\s+the\s+)?(?:roof|walls?|ceiling|gable|floor|wing|section|half)))\b/g

const ACCESS_RE = /\b(?:tight|limited|restricted|poor|difficult|hard|awkward|low|steep|narrow)\s+(?:access|clearance|headroom|driveway|parking|site|block|roof)\b|\bcrawl\s?space\b|\bhard to (?:get to|reach|access|get at)\b|\bno\s+(?:power|water|parking|access|room to park|ladder access|vehicle access)\b|\bscaffold(?:ing)?\b|\bcherry picker\b|\belevated work platform\b|\bewp\b|\blocked gate\b|\bdogs?\b|\b(?:2|two)[\s-]?man lift\b|\bboom lift\b|\bhigh roof\b/g
const POST_NEG_RE = /\b(?:is|are)?\s*(?:not included|not needed|not required|not wanted|not part of (?:it|the job)|isn'?t included|aren'?t included|excluded|left out|stays as is|stay as is|not going ahead)\b/g
const HOURS_RE = /(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)\b/
const STOREY_RE = /\b(?:(single|double|triple|\d+)[\s-]*(?:storey|story|level)s?(?:ed)?|second[\s-]?(?:storey|story))\b/g
const NEG_RE = /\b(?:not|no|excluding|exclude|excludes|excluded|except|without|leave out|leaving out|skip(?!\s*bin)|don'?t do|dont do|do not do|ignore|ignoring|isn'?t|aren'?t)\b([^,;]*)/g
const GLOBAL_RE = /\b(?:all|both|every(?:thing|where)?|throughout|the lot|whole|each)\b/
const TOTAL_BEFORE = /\b(?:total|all up|altogether|overall|combined)\s*(?:of|is|about|approx|around|roughly|:|=)?\s*$/
const TOTAL_AFTER = /^\s*(?:in total|total|all up|altogether|overall|combined)\b/
const APPROX_BEFORE = /\b(?:approx(?:imately)?|apx|about|around|roughly|circa|estimated?|~)\s*$/
const APPROX_AFTER = /^\s*(?:ish|or so|odd|give or take)\b/

const EXTRA_RES: { kind: ExtraKind; re: RegExp; reverse?: RegExp }[] = [
  {
    kind: 'removeBatts',
    re: /\b(?:remov\w*|strip\w*|tak\w* out|rip\w* out|dispos\w*|clear\w* out)\s+(?:of\s+)?(?:the\s+)?(?:old\s+|existing\s+)?(?:pink\s+)?(?:batts?|bats|insulation|fibreglass|fiberglass|wool)\b/g,
    reverse: new RegExp(`${NUM}\\s*${AREA_UNIT}\\s*(?:of\\s+)?(?:the\\s+)?(?:old|existing)\\s+(?:pink\\s+)?(?:batts?|bats|insulation|fibreglass|fiberglass|wool)(?:\\s+to\\s+(?:come\\s+out|be\\s+removed|remove|go))?`, 'g'),
  },
  { kind: 'removeBatts', re: /\b(?:old|existing)\s+(?:pink\s+)?(?:batts?|bats)\s+(?:to\s+(?:come\s+out|be\s+removed|remove|go)|(?:need|needs)\s+(?:to\s+)?(?:come\s+out|removing|removal|to go))\b/g },
  { kind: 'skipBin', re: /\bskip\s?bins?\b|\bbin hire\b|\bskip hire\b/g },
  { kind: 'masking', re: /\bmask(?:ing|ed)?\b|\bprotect(?:ion)?\s+(?:the\s+)?(?:windows|floors?|fittings|surfaces|cars?|furniture)\b|\bcover(?:ing)?\s+(?:the\s+)?(?:windows|cars?|furniture)\b|\bsite set\s?up\b/g },
  { kind: 'fireCoating', re: /\bfire[\s-]?(?:rated|coat\w*|retardant)\b|\bintumescent\b|\bignition barrier\b|\bthermal barrier\b/g },
  { kind: 'edgeSealing', re: /\bedge\s+seal\w*\b|\bseal\w*\s+(?:the\s+)?(?:floor\s+)?edges?\b/g },
]

// ---- Finding things in a sentence ---------------------------------------------

interface Hit {
  start: number
  end: number
}
interface AreaHit extends Hit {
  type: 'area'
  kind: 'dims2' | 'dims3' | 'm2'
  /** The numbers: dims2 a x b, dims3 a x b x c, m2 the area itself. */
  nums: number[]
  /** Fixed area for kinds that need no part (m2, feet). */
  m2?: number
  approx: boolean
  total: boolean
  text: string
}
interface PlaceHit extends Hit {
  type: 'place'
  name: string
  building: boolean
}
interface PartHit extends Hit {
  type: 'part'
  part: Part
}
interface AttrHit extends Hit {
  type: 'attr'
  foam?: Foam
  thick?: number
  range?: [number, number]
  r?: number
  global: boolean
}
type Ev = AreaHit | PlaceHit | PartHit | AttrHit

const blank = (s: string, a: number, b: number) => s.slice(0, a) + ' '.repeat(b - a) + s.slice(b)
const n = (x: string) => Number(x)

/** Run a regex on the working text. fn gets each match; when it returns true the matched text is blanked. */
function scan(work: { s: string }, re: RegExp, fn: (m: RegExpExecArray) => boolean | void) {
  re.lastIndex = 0
  const hits: RegExpExecArray[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(work.s))) {
    hits.push(m)
    if (m[0] === '') re.lastIndex++
  }
  for (const h of hits) if (fn(h) !== false) work.s = blank(work.s, h.index, h.index + h[0].length)
}

function areaHits(s: string, work: { s: string }): AreaHit[] {
  const out: AreaHit[] = []
  const common = (m: RegExpExecArray) => {
    const start = m.index
    const end = m.index + m[0].length
    const before = s.slice(Math.max(0, start - 18), start)
    const after = s.slice(end, end + 14)
    return { start, end, approx: APPROX_BEFORE.test(before) || APPROX_AFTER.test(after) || /\dish/.test(m[0]), total: TOTAL_BEFORE.test(before) || TOTAL_AFTER.test(after), text: m[0].trim(), after: s.slice(end, end + 16) }
  }
  scan(work, DIMS3, (m) => {
    const c = common(m)
    const nums = [n(m[1]), n(m[2]), n(m[3])]
    if (nums.some((x) => x > 200 || x <= 0) || TIMBER.test(c.after)) return false
    out.push({ type: 'area', kind: 'dims3', nums, ...c })
  })
  scan(work, LONGHIGH, (m) => {
    const c = common(m)
    out.push({ type: 'area', kind: 'dims2', nums: [n(m[1]), n(m[2])], ...c })
  })
  scan(work, DIMS2, (m) => {
    const c = common(m)
    const nums = [n(m[1]), n(m[2])]
    if (nums.some((x) => x > 200 || x <= 0) || TIMBER.test(c.after)) return false
    out.push({ type: 'area', kind: 'dims2', nums, ...c })
  })
  scan(work, M2, (m) => {
    if (!(n(m[1]) > 0)) return false
    const c = common(m)
    out.push({ type: 'area', kind: 'm2', nums: [n(m[1])], m2: n(m[1]), ...c })
  })
  scan(work, FT2, (m) => {
    const c = common(m)
    out.push({ type: 'area', kind: 'm2', nums: [n(m[1])], m2: Math.round(n(m[1]) * 0.092903 * 100) / 100, ...c })
  })
  return out
}

/** The m2 of an area hit once the part is known: three numbers on walls are length x width x height around the room. */
function m2Of(a: AreaHit, part: Part): number {
  if (a.m2 !== undefined) return a.m2
  const [x, y, z] = a.nums
  const v = a.kind === 'dims3' && part === 'walls' ? 2 * (x + y) * z : x * y
  return Math.round(v * 100) / 100
}

interface Group {
  part?: Part
  partGuessed?: boolean
  places: string[]
  buildingPlaces: string[]
  areas: AreaHit[]
  foam?: Foam
  thick?: number
  range?: [number, number]
  r?: number
  attrAfterArea: boolean
  start: number
  end: number
  excluded?: string
  noUnit?: boolean
  /** Total hits are not groups. */
}

const newGroup = (at: number): Group => ({ places: [], buildingPlaces: [], areas: [], attrAfterArea: false, start: at, end: at })
const hasBody = (g: Group) => g.areas.length > 0 || g.attrAfterArea

const CONNECTORS = /^[\s,+&]*(?:(?:and|plus|also|then|another|with|\+)\b[\s,]*)*$/

interface SentenceOut {
  groups: Group[]
  extras: ReadExtra[]
  exclusions: { note: ReadNote; locs: string[]; parts: Part[] }[]
  access: ReadNote[]
  storeys?: { count: number; phrase: string }
  totals: { m2: number; phrase: string }[]
  unused: string[]
  eventCount: number
}

let counter = 0
const nextId = (p: string) => `${p}${++counter}`

/** Read one tidy sentence. `spanOf` cuts the phrase for a group from the sentence text. */
function readSentence(s: string): SentenceOut {
  const work = { s }
  const out: SentenceOut = { groups: [], extras: [], exclusions: [], access: [], totals: [], unused: [], eventCount: 0 }

  // 1. Access remarks.
  scan(work, ACCESS_RE, (m) => {
    out.access.push({ text: m[0], phrase: s.trim() })
    out.eventCount++
  })

  // 2. What is left out: "not the garage", "excluding the shed". The clause is read on its own.
  const negClauses: { text: string; index: number }[] = []
  scan(work, NEG_RE, (m) => {
    const tail = m[1].split(/\b(?:but|then|also|plus|however)\b/)[0]
    const body = m[0].slice(0, m[0].length - m[1].length) + tail
    const hasPart = PART_RES.some((p) => new RegExp(p.re.source).test(tail))
    const hasPlace = new RegExp(BUILDING_PLACES.source).test(tail) || new RegExp(ROOM_PLACES.source).test(tail)
    if (!hasPart && !hasPlace) return false
    negClauses.push({ text: body, index: m.index })
    // Only blank what we consumed (the clause up to a "but").
    work.s = blank(work.s, m.index, m.index + body.length)
    out.eventCount++
    return false
  })
  // "the garage is not included", "shed excluded": the left-out part comes before the words.
  scan(work, POST_NEG_RE, (m) => {
    const cut = Math.max(work.s.lastIndexOf(',', m.index), work.s.lastIndexOf(';', m.index))
    const head = work.s.slice(cut + 1, m.index)
    const text = (head + m[0]).trim()
    const hasPart = PART_RES.some((p) => new RegExp(p.re.source).test(head))
    const hasPlace = new RegExp(BUILDING_PLACES.source).test(head) || new RegExp(ROOM_PLACES.source).test(head)
    if (!hasPart && !hasPlace) return false
    negClauses.push({ text, index: cut + 1 })
    work.s = blank(work.s, cut + 1, m.index + m[0].length)
    out.eventCount++
    return false
  })
  for (const c of negClauses) {
    const locs: string[] = []
    const parts: Part[] = []
    for (const p of PART_RES) if (new RegExp(p.re.source).test(c.text)) parts.push(p.part)
    for (const re of [BUILDING_PLACES, ROOM_PLACES]) {
      const r = new RegExp(re.source, 'g')
      let m: RegExpExecArray | null
      while ((m = r.exec(c.text))) locs.push(placeName(m, re === BUILDING_PLACES))
    }
    out.exclusions.push({ note: { text: c.text.trim(), phrase: s.trim() }, locs, parts })
  }

  // 3. Extras: removal of old batts, skip bin, masking, fire coating, edge sealing (with a size when one is next to it).
  for (const e of EXTRA_RES) {
    if (e.reverse) {
      scan(work, e.reverse, (m) => {
        out.extras.push({ id: nextId('x'), kind: e.kind, phrase: m[0].trim(), qty: n(m[1]) })
        out.eventCount++
      })
    }
    scan(work, e.re, (m) => {
      const after = work.s.slice(m.index + m[0].length)
      const lead = /^(?:[\s:,-]|\b(?:of|for|about|approx|approximately|around|roughly|is|are|from|in|the|ceiling|roof|walls?|existing|old|batts?|coating|coat)\b)*/.exec(after)?.[0] ?? ''
      let qty: number | null = null
      let consumed = m[0].length
      if (e.kind === 'removeBatts' || e.kind === 'fireCoating') {
        const probe = { s: after.slice(lead.length) }
        const am = new RegExp(`^${NUM}\\s*${AREA_UNIT}(?![a-z0-9])`).exec(probe.s)
        if (am) {
          qty = n(am[1])
          consumed += lead.length + am[0].length
        }
      }
      out.extras.push({ id: nextId('x'), kind: e.kind, phrase: s.slice(m.index, m.index + consumed).trim(), qty })
      out.eventCount++
      work.s = blank(work.s, m.index, m.index + consumed)
      return false
    })
  }

  // 4. Storeys.
  scan(work, STOREY_RE, (m) => {
    const w = m[1] ?? '2'
    const count = w === 'single' ? 1 : w === 'double' ? 2 : w === 'triple' ? 3 : Number(w)
    if (!out.storeys) out.storeys = { count: Number.isFinite(count) ? count : 2, phrase: m[0] }
    out.eventCount++
  })

  // 5. Hours for extra access time (only when the same sentence has an access remark).
  if (out.access.length) {
    const hm = HOURS_RE.exec(work.s)
    if (hm) {
      out.extras.push({ id: nextId('x'), kind: 'accessTime', phrase: s.trim(), qty: n(hm[1]) })
      work.s = blank(work.s, hm.index, hm.index + hm[0].length)
      out.eventCount++
    }
  }

  // 6. The events, left to right.
  const events: Ev[] = []
  const areas = areaHits(s, work)
  // Sizes that are a quoted total are noted, not made into a group.
  for (const a of areas) {
    if (a.total) {
      out.totals.push({ m2: a.m2 ?? Math.round(a.nums[0] * (a.nums[1] ?? 1) * 100) / 100, phrase: s.trim() })
      out.eventCount++
    } else events.push(a)
  }
  const global = (index: number) => GLOBAL_RE.test(s.slice(Math.max(0, index - 30), index))
  scan(work, THICK_MM, (m) => {
    if (m[1] !== undefined && m[2] !== undefined) events.push({ type: 'attr', start: m.index, end: m.index + m[0].length, thick: Math.max(n(m[1]), n(m[2])), range: [n(m[1]), n(m[2])], global: global(m.index) })
    else events.push({ type: 'attr', start: m.index, end: m.index + m[0].length, thick: n(m[3]), global: global(m.index) })
  })
  scan(work, THICK_CM, (m) => {
    const mm = n(m[1]) * 10
    if (mm > 400) return false
    events.push({ type: 'attr', start: m.index, end: m.index + m[0].length, thick: mm, global: global(m.index) })
  })
  scan(work, THICK_IN, (m) => {
    const mm = Math.round(n(m[1]) * 25.4)
    if (mm > 400) return false
    events.push({ type: 'attr', start: m.index, end: m.index + m[0].length, thick: mm, global: global(m.index) })
  })
  scan(work, RVALUE, (m) => {
    const r = n(m[1] ?? m[2])
    if (!(r > 0 && r <= 15)) return false
    events.push({ type: 'attr', start: m.index, end: m.index + m[0].length, r, global: global(m.index) })
  })
  scan(work, CLOSED, (m) => void events.push({ type: 'attr', start: m.index, end: m.index + m[0].length, foam: 'closed', global: global(m.index) }))
  scan(work, OPEN, (m) => void events.push({ type: 'attr', start: m.index, end: m.index + m[0].length, foam: 'open', global: global(m.index) }))
  for (const p of PART_RES) scan(work, p.re, (m) => void events.push({ type: 'part', part: p.part, start: m.index, end: m.index + m[0].length }))
  for (const re of [BUILDING_PLACES, ROOM_PLACES]) {
    scan(work, re, (m) => void events.push({ type: 'place', name: placeName(m, re === BUILDING_PLACES), building: re === BUILDING_PLACES, start: m.index, end: m.index + m[0].length }))
  }
  // A bare number straight after a part word ("roof 60") is read as m2 and marked as such.
  const bare = new RegExp(`(?:^|\\s)${NUM}(?![\\d.]*\\d)(?!\\s*(?:mm|cm|m\\b|inch|in\\b|%|storey|story|hours?|hrs?|lb|pound|k\\b|dollars|\\$|x|by|times|kg|l\\b))`, 'g')
  const partEnds = events.filter((e): e is PartHit => e.type === 'part').map((e) => e.end)
  const bareHits: AreaHit[] = []
  scan(work, bare, (m) => {
    const numStart = m.index + m[0].length - m[1].length
    const near = partEnds.some((pe) => numStart >= pe && /^[\s:=-]*(?:is|of|about|approx|around|roughly)?[\s:=-]*$/.test(s.slice(pe, numStart)))
    if (!near) return false
    const v = n(m[1])
    if (!(v > 0 && v < 5000)) return false
    bareHits.push({ type: 'area', kind: 'm2', nums: [v], m2: v, approx: APPROX_BEFORE.test(s.slice(Math.max(0, numStart - 18), numStart)), total: false, start: numStart, end: numStart + m[1].length, text: m[1] })
  })
  const bareSet = new Set<AreaHit>(bareHits)
  events.push(...bareHits)

  events.sort((a, b) => a.start - b.start)
  out.eventCount += events.length

  // 7. Group the events.
  const groups: Group[] = []
  let cur = newGroup(0)
  const push = () => {
    if (cur.areas.length || cur.part || cur.places.length || cur.attrAfterArea || cur.foam || cur.thick || cur.r) groups.push(cur)
  }
  const gapWords = (from: number, to: number) => s.slice(from, to).trim().split(/\s+/).filter(Boolean).length
  const attrGroups: { ev: AttrHit; g: Group }[] = []
  for (const ev of events) {
    if (ev.type === 'place') {
      if (hasBody(cur) && !cur.part && gapWords(cur.end, ev.start) <= 3) {
        cur.places.push(ev.name)
        if (ev.building) cur.buildingPlaces.push(ev.name)
        cur.end = ev.end
      } else {
        if (hasBody(cur)) {
          push()
          cur = newGroup(ev.start)
        }
        cur.places.push(ev.name)
        if (ev.building) cur.buildingPlaces.push(ev.name)
        if (!cur.areas.length) cur.start = Math.min(cur.start || ev.start, ev.start)
        cur.end = ev.end
      }
    } else if (ev.type === 'part') {
      if (cur.part && (hasBody(cur) || (ev.part !== cur.part && gapWords(cur.end, ev.start) >= 2))) {
        push()
        cur = newGroup(ev.start)
      } else if (!cur.part && hasBody(cur) && gapWords(cur.end, ev.start) > 3) {
        push()
        cur = newGroup(ev.start)
      }
      if (!cur.part) cur.part = ev.part
      if (!cur.areas.length && !cur.places.length) cur.start = ev.start
      cur.end = ev.end
    } else if (ev.type === 'area') {
      if (cur.areas.length && !CONNECTORS.test(s.slice(cur.end, ev.start))) {
        push()
        cur = newGroup(ev.start)
      }
      if (!cur.areas.length && cur.start === 0 && !cur.part && !cur.places.length) cur.start = ev.start
      cur.areas.push(ev)
      if (bareSet.has(ev)) cur.noUnit = true
      cur.end = ev.end
    } else {
      // attribute
      if (cur.areas.length && cur.attrAfterArea && ((ev.foam && cur.foam) || (ev.thick && cur.thick) || (ev.r && cur.r))) {
        push()
        cur = newGroup(ev.start)
      }
      if (ev.foam && !cur.foam) cur.foam = ev.foam
      if (ev.thick && !cur.thick) {
        cur.thick = ev.thick
        if (ev.range) cur.range = ev.range
      }
      if (ev.r && !cur.r) cur.r = ev.r
      if (cur.areas.length) cur.attrAfterArea = true
      else if (!cur.part && !cur.places.length && cur.start === 0) cur.start = ev.start
      cur.end = Math.max(cur.end, ev.end)
      attrGroups.push({ ev, g: cur })
    }
  }
  push()

  // "Both closed cell 100mm": an attribute with "both/all/each" before it goes to every group in the sentence.
  for (const { ev } of attrGroups) {
    if (!ev.global) continue
    for (const g of groups) {
      if (ev.foam && !g.foam) g.foam = ev.foam
      if (ev.thick && !g.thick) {
        g.thick = ev.thick
        if (ev.range) g.range = ev.range
      }
      if (ev.r && !g.r) g.r = ev.r
    }
  }

  // Phrase text for a group: from its start to its end in the tidy sentence.
  for (const g of groups) (g as Group & { phrase?: string }).phrase = s.slice(g.start, g.end).trim() || s.trim()
  out.groups = groups

  // Numbers nobody used.
  const rest = work.s
  const um = rest.match(/\d+(?:\.\d+)?/g)
  if (um && groups.length + out.extras.length > 0) out.unused = um
  return out
}

function placeName(m: RegExpExecArray, building: boolean): string {
  if (building) return m[1].replace(/\s+/g, ' ')
  if (m[1] !== undefined) return m[2] ? `bed ${m[2]}` : 'bed'
  return (m[3] ?? m[4] ?? m[0]).trim().replace(/\s+/g, ' ')
}

// ---- The whole note -------------------------------------------------------------

/** Rooms of the same ceiling or wall add up into one line; a garage or shed stays its own line. */
function mergeKey(i: ReadItem, building: string[]): string {
  return [i.part, building.join('+'), i.foam ?? '', i.thicknessMm ?? '', i.rValue ?? '', i.excluded ?? ''].join('|')
}

export function readNotes(raw: string): ReadResult {
  counter = 0
  const tidyText = tidy(raw)
  const result: ReadResult = { items: [], extras: [], access: [], exclusions: [], totals: [], leftovers: [], unusedNumbers: [] }
  const buildings = new Map<string, string[]>()
  const exclusions: { locs: string[]; parts: Part[]; phrase: string }[] = []
  let carry: { part: Part; places: string[]; buildings: string[] } | null = null
  let heading: { g: Group & { phrase?: string } } | null = null
  const globalAttrs: { foam?: Foam; thick?: number; r?: number } = {}
  let lastSentenceItems: ReadItem[] = []
  let curSentence = ''

  const flushHeading = () => {
    if (!heading) return
    const g = heading.g
    result.items.push(toItem(g, g.part as Part, false))
    heading = null
  }
  function toItem(g: Group & { phrase?: string }, part: Part, guessed: boolean): ReadItem {
    const pieces = g.areas.map((a) => ({ text: a.text, m2: m2Of(a, part) }))
    const total = pieces.reduce((t, p) => t + p.m2, 0)
    const item: ReadItem = {
      id: nextId('i'),
      part,
      places: [...g.places],
      areaM2: g.areas.length ? Math.round(total * 100) / 100 : null,
      pieces,
      phrase: g.phrase ?? '',
      context: curSentence,
      ...(g.foam ? { foam: g.foam } : {}),
      ...(g.thick ? { thicknessMm: g.thick } : {}),
      ...(g.range ? { thicknessRange: g.range } : {}),
      ...(g.r ? { rValue: g.r } : {}),
      ...(g.areas.some((a) => a.approx) ? { approx: true } : {}),
      ...(guessed ? { partGuessed: true } : {}),
      ...(g.noUnit ? { noUnit: true } : {}),
      ...(g.excluded ? { excluded: g.excluded } : {}),
    }
    buildings.set(item.id, g.buildingPlaces)
    return item
  }

  for (const s of sentences(tidyText)) {
    curSentence = s
    const out = readSentence(s)
    result.extras.push(...out.extras)
    result.access.push(...out.access)
    result.totals.push(...out.totals)
    if (out.storeys && !result.storeys) result.storeys = out.storeys
    for (const x of out.exclusions) {
      result.exclusions.push(x.note)
      exclusions.push({ locs: x.locs, parts: x.parts, phrase: x.note.text })
    }
    for (const u of out.unused) result.unusedNumbers.push({ value: u, phrase: s })

    const groups = out.groups as (Group & { phrase?: string })[]
    const itemsHere: ReadItem[] = []

    // A sentence with only attributes ("closed cell 100mm throughout") is a default for the items around it.
    const onlyAttrs = groups.length > 0 && groups.every((g) => !g.part && !g.areas.length && !g.places.length)
    if (onlyAttrs) {
      const a: { foam?: Foam; thick?: number; r?: number } = {}
      for (const g of groups) {
        a.foam ??= g.foam
        a.thick ??= g.thick
        a.r ??= g.r
      }
      const apply = (i: ReadItem) => {
        if (a.foam && !i.foam) i.foam = a.foam
        if (a.thick && !i.thicknessMm) i.thicknessMm = a.thick
        if (a.r && !i.rValue) i.rValue = a.r
      }
      if (GLOBAL_RE.test(s)) {
        result.items.forEach(apply)
        Object.assign(globalAttrs, a)
      } else lastSentenceItems.forEach(apply)
      continue
    }

    let prev: { part: Part; guessed: boolean } | null = null
    let madeHeading = false
    groups.forEach((g, idx) => {
      // A heading on its own line ("Ceiling:") hands its part to the next sentence.
      if (heading && idx === 0 && !g.part) {
        const h = heading.g
        g.part = h.part
        if (!g.places.length) {
          g.places = [...h.places]
          g.buildingPlaces = [...h.buildingPlaces]
        }
        g.foam ??= h.foam
        g.thick ??= h.thick
        g.r ??= h.r
        heading = null
      } else if (heading && idx === 0) flushHeading()

      let part = g.part
      let guessed = false
      if (!part) {
        if (prev) {
          part = prev.part
          guessed = prev.guessed || g.buildingPlaces.length > 0 || g.places.length === 0
        } else if (carry) {
          part = carry.part
          guessed = true
        }
      }
      if (!g.areas.length && !g.part) return
      // A part with no size at the end of a sentence may be a heading for the next one.
      if (!g.areas.length && g.part && idx === groups.length - 1 && !g.foam && !g.thick && !g.r) {
        heading = { g }
        madeHeading = true
        carry = { part: g.part, places: g.places, buildings: g.buildingPlaces }
        return
      }
      const item = toItem(g, part ?? 'unknown', guessed)
      if (globalAttrs.foam && !item.foam) item.foam = globalAttrs.foam
      if (globalAttrs.thick && !item.thicknessMm) item.thicknessMm = globalAttrs.thick
      if (globalAttrs.r && !item.rValue) item.rValue = globalAttrs.r
      itemsHere.push(item)
      result.items.push(item)
      prev = { part: part ?? 'unknown', guessed }
      carry = part ? { part, places: g.places, buildings: g.buildingPlaces } : carry
    })
    if (heading && groups.length === 0) flushHeading()
    lastSentenceItems = itemsHere

    const meaningful = itemsHere.length > 0 || madeHeading || out.extras.length > 0 || out.access.length > 0 || !!out.storeys || out.exclusions.length > 0 || out.totals.length > 0
    if (!meaningful) result.leftovers.push(s)
  }

  flushHeading()

  // Apply the exclusions to the items they name.
  for (const ex of exclusions) {
    if (!ex.locs.length && !ex.parts.length) continue
    for (const i of result.items) {
      const placeOk = ex.locs.length === 0 || ex.locs.every((l) => i.places.includes(l))
      const partOk = ex.parts.length === 0 || ex.parts.includes(i.part)
      if (placeOk && partOk && !i.excluded) i.excluded = ex.phrase
    }
  }

  // Merge the rooms of one ceiling, one wall set, and so on.
  const merged: ReadItem[] = []
  const byKey = new Map<string, ReadItem>()
  for (const i of result.items) {
    const b = buildings.get(i.id) ?? []
    const key = i.areaM2 === null || i.part === 'unknown' ? `solo|${i.id}` : mergeKey(i, b)
    const into = byKey.get(key)
    if (into && into.areaM2 !== null && i.areaM2 !== null) {
      into.pieces.push(...i.pieces)
      into.areaM2 = Math.round((into.areaM2 + i.areaM2) * 100) / 100
      into.places = [...new Set([...into.places, ...i.places])]
      into.phrase = `${into.phrase} | ${i.phrase}`
      if (i.approx) into.approx = true
      if (i.partGuessed) into.partGuessed = true
      if (i.noUnit) into.noUnit = true
    } else {
      byKey.set(key, i)
      merged.push(i)
    }
  }
  result.items = merged
  return result
}

/** A short name for a read item, for example "Garage roof". */
export function itemLabel(i: Pick<ReadItem, 'part' | 'places'>): string {
  const places = i.places.length > 2 ? i.places.slice(0, 2) : i.places
  const first = [...places, PART_LABEL[i.part].toLowerCase()].join(' ')
  return first.charAt(0).toUpperCase() + first.slice(1)
}
