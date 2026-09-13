# Spray It Solutions: website rebuild

A hand-coded React marketing site for **Spray It Solutions (SprayIT)**, a family-owned
spray foam insulation contractor in Carrum Downs, Victoria, servicing Melbourne and
Australia-wide. This replaces the previous Elementor/WordPress build.

The **homepage is built in full** as the proof-of-concept. The remaining routes are
scaffolded with a shared layout so they drop in cleanly.

---

## Getting started

```bash
npm install     # install dependencies
npm run dev     # start the Vite dev server (http://localhost:5173)
npm run build   # typecheck + production build to dist/
npm run preview # serve the production build locally
npm run typecheck
```

Requires Node 18+ (developed on Node 22). The build output in `dist/` is a static SPA.
Deploy it to any static host. Because it uses client-side routing, configure the host to
rewrite unknown paths to `/index.html`.

---

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 5 + React 18 + TypeScript (strict) |
| Routing | React Router 6 |
| Animation | GSAP + ScrollTrigger via `@gsap/react` (`useGSAP`) |
| Smooth scroll | Lenis (`lenis/react`), driven by the GSAP ticker |
| 3D | React Three Fiber + drei, lazy-loaded |
| Carousel | Embla, lazy-loaded |
| Icons | Lucide React |
| Styling | Tailwind CSS 3, brand tokens as CSS custom properties |

**Dark depth ladder.** Sections alternate between two grounds so their boundaries are
readable without leaving the dark palette: `ink` (#0A0A0B) and `surface` (#111115), with a
white/6 hairline at each join. Cards sit on `ink-800` (#1A1A1F) and lift to `ink-700`
(#24242A) on hover. Four rungs, each a clear step above the last, so a section, a card on
that section, and that card's hover state never resolve to the same value. Changing the
rhythm is a matter of swapping `bg-ink` and `bg-surface` on the section elements.
| SEO | react-helmet-async |
| Fonts | Clash Display + Satoshi (Fontshare) |

---

## Project structure

```
index.html             Runtime SITE CONFIGURATION block lives here, see DEPLOY.md
src/
  main.tsx
  App.tsx              Router + ReactLenis root + GSAP registration + Helmet provider
  pages/               Home About SprayFoam Residential Commercial Gallery Blog BlogPost
                       Contact Book ThankYou Privacy NotFound HeroPreview
  components/          Header Footer Layout, the hero variants (HeroHouse is the one
                       that ships), HouseSection, InsulationScene, RValueExplainer,
                       SectorCards, Testimonials, WorkVideos, QuoteForm, FAQ, and the
                       section parts each page is built from
    ui/                Figure Logo MagneticButton ProtectedImage SectionBackdrop
                       SectionHeading Seo VideoCarousel VideoEmbed
  three/               HeroObject SealScene Scene, lazy R3F scenes
  data/                Every word of copy: site, pages, content, testimonials, faqs,
                       gallery, blog, videos, forms, legal, stats, rvalue, sectors
  hooks/               useReducedMotion useMagnetic useMediaQuery useCarouselWheel
  lib/                 gsap.ts (single plugin registration) images.ts leadSubmit.ts
                       attribution.ts analytics.ts boot.ts
  config/              integrations.ts, runtime config read from window
  styles/              tokens.css index.css
public/                favicon.svg, logo/, gallery/ (watermarked job photos), blog/,
                       docs/ (client fact sheets), brands/, site/, sitemap.xml, robots.txt

client-journey-onepage/  The customer journey: every message, task and alert for
                         both pipelines, rendered from journey-data.js.
                           index.html   the client's page. Nothing agency-facing on it.
                           agency.html  the build sheet: merge fields by default, reuse
                                        tags, agency notes, fields to create, go-live
                                        checklist. Never send this one to the client.
                         The two CRM documents below are generated from the same
                         data file.
CRM-PIPELINES.md         Pipeline and stage design for the Systemations build
CRM-MESSAGING.md         Every SMS and email, generated from the journey data
CRM-TASKS-NOTIFICATIONS.md  Alerts, tasks, escalation and digests, generated too
DEPLOY.md                How to build, configure and transfer the site
scripts/                 journey-check.mjs and gen-crm-docs.mjs, see below
```

### Regenerating the CRM documents

Edit `client-journey-onepage/journey-data.js`, then:

```bash
npm run docs:crm
```

That checks the data (every message referenced, every merge field has a sample
value, every email has a subject and preheader, no house-style slips) and then
writes `CRM-MESSAGING.md` and `CRM-TASKS-NOTIFICATIONS.md` from it. Both files
say so at the top. Editing them by hand will be overwritten. `npm run docs:check`
runs the checks alone. The scripts live in `scripts/`.

### Hero A/B: one-line swap

### Compare them live

**`/heroes`** lists all seven. **`/heroes/:id`** renders one on its own, in the real site
chrome, with a fixed switcher for hopping between them. Both routes are `noindex`.

### Ship one

Change one value in [`src/config.ts`](src/config.ts):

```ts
export const ACTIVE_HERO: 'house' | 'spray' | 'foam' | 'editorial' | 'comfort' | 'thermal' | 'seal' = 'house'
```

| Value | Component | Idea |
| --- | --- | --- |
| `'house'` | `HeroHouse.tsx` | **Current.** A pinned house cutaway leaking from roof, walls and underfloor. Scroll seals each zone while the meter counts down through the real reading. |
| `'spray'` | `HeroSpray.tsx` | A pinned wall cavity you fill by scrolling. Foam rises, the draft arrows die one by one, the wall ends sealed and warm. |
| `'foam'` | `HeroFoam.tsx` | The headline is knocked out of an ink panel, so footage plays inside the letterforms. Dark, warm, centred. |
| `'editorial'` | `HeroEditorial.tsx` | Light, split-screen, type-led. The photograph is a panel beside the headline, not a backdrop. No drag or scroll mechanic. |
| `'comfort'` | `HeroComfort.tsx` | The same room either side of a drag divider: one cold winter, one warm one. |
| `'thermal'` | `Hero.tsx` | A thermal camera lens you drag over the house, revealing a heat-mapped view underneath. |
| `'seal'` | `HeroSeal.tsx` | A pinned scroll-through of a wall cross-section: cold outside → sealed → warm inside. |

Metadata for all four lives in [`src/data/heroes.ts`](src/data/heroes.ts), which drives
both the preview index and the switcher.

**Why `house` is the default.** It takes the mechanic from `spray` and scales the canvas
from one wall bay to a whole building. A two-storey cutaway leaks warmth from the roof,
the walls and the underfloor; scrolling seals each zone in turn, the leaks stop as their
zone closes, the rooms warm, and the meter counts down.

Three things make it more than a bigger diagram:

- **The three zones are the real residential services.** Roof & Ceiling, Wall and
  Underfloor, in that order, are what SprayIT actually sells. The hero is a product menu
  that happens to animate.
- **The meter is real.** It scrubs from 245.1 to 210 KW per week, which is the customer
  reading already quoted elsewhere on the page, so the payoff is a measured number rather
  than a claim. It is driven by the scrub, so it climbs back if you scroll up.
- **One story, one colour.** Every leak is heat leaving the building and every leak points
  outward. An earlier diagram carried two opposing flows in a single colour and read as a
  contradiction.

The drawing carries windows, a door, a chimney, a ridge cap and floor slabs, because those
do more for comprehension than annotation does. There are no zone labels: the drawing says
which part is which, and the space they took is worth more given to the house.

The readouts under the house are a caption strip, not cards. Boxed and set at display size
they read as heavier than the drawing they annotate, which is backwards when the house is
the subject.

Three geometry bugs worth remembering, all of which looked fine in code:

- The attic void was drawn from the ridge straight to the eaves at ceiling height, which
  pushed a dark triangle out past the roof on both sides. It now follows the real roof
  underside via `undersideY()`.
- The roof foam band splayed below the eaves for the same reason. It is now a band
  parallel to the pitch.
- The chimney was drawn after the roof, so its base sat on top of the tiles. It is drawn
  before the roof and its base is hidden by the roof surface. Roof battens were removed
  entirely: their end points fell outside the roof band and left strokes hanging off the
  pitch.
- The escaping wisps wandered into the rooms and travelled in inconsistent directions.
  Each carried its position in an SVG `transform` attribute, and animating `x`/`y` with
  GSAP **replaces** that transform rather than offsetting it, so every wisp snapped to the
  origin the moment it moved. Each one is now three nested groups: position on the outer,
  orientation on the path, and a bare middle group that is the only thing GSAP touches.
  Verified by sampling their coordinates across the loop: roof rises, left wall goes left,
  right wall goes right, underfloor sinks, each holding its other axis constant.

**Foam goes inside the construction.** Walls are drawn as three parts, outer leaf, cavity
and inner lining, and the foam fills the cavity between them. An earlier version painted it
on the room side of the lining and it looked like the rooms themselves were being filled.
Roof foam sits between the roof and the ceiling, underfloor foam beneath the floor slab.

**The two readouts are not derived from each other.** 245.1 to 210 KW works out at 14.3%,
but 14.5% is the figure the customer reported and the one quoted everywhere else on this
site. Deriving the percentage from the reading put two percentages one line apart that
disagreed, so both are tweened independently to their published values. Worth raising with
the client: their own two numbers imply 14.3%, not 14.5%.

**About `spray`.** Kept and switchable. It is pinned, and the scroll does the work rather
than moving a camera. The cavity starts open and leaking cold; scrolling sprays it, foam
expands and cures, the draft arrows die one by one, and the wall finishes sealed and warm.
The headline, subhead and CTAs never move for the whole pin, so there is exactly one thing
to watch and the calls to action stay on screen throughout.

Drawn as SVG, not WebGL. An earlier hero rendered this same subject in Three.js and the
procedural geometry never looked better than a diagram while costing a 225 KB download.
Flat, it is sharper, weighs nothing, and animates on the compositor.

**Reading as a wall.** The section is extruded: a top face showing the build-up in
section, and a right face with thickness. A flat rectangle reads as an abstract container;
the extrusion is what makes it a physical chunk of wall that has been cut open.

**The leak, and why two directions is correct.** Two flows cross this cavity and they run
in opposite directions, which is the physics: cold infiltrates inward from outside, and
warm air exfiltrates outward from the room. Drawn in one colour they read as a single
system contradicting itself, so the draught is cold blue running left to right and the
escaping warmth is amber running right to left, with OUTSIDE and INSIDE labelled beneath
the wall so the orientation is not left to inference.

The escape is deliberately not on the scrub, because a wall leaks whether or not anyone is
scrolling. Each dot is then snuffed out at the exact progress where the rising foam
reaches its row, so the leak stops from the bottom up rather than all at once, and a
SEALED stamp lands once nothing is getting out.

The opening caption renders at full opacity at rest rather than being faded in from zero
at timeline position 0, which had left it blank until the visitor scrolled.

**It pins on mobile too, but pins something different.** Below `lg` the copy and the house
are a full screen each, and only the house block is pinned, so the visitor reads the pitch,
then the house sticks and fills as they keep scrolling. Pinning the whole section there
would have meant pinning two screens' worth of content into one. Desktop still pins the
section as a single centred screen.

The pin is gated on width, height and a runtime measurement. Where it will not fit, and on
viewports too short to hold one, the same sequence plays once on entry instead, so the
story is never simply missing. Under reduced motion every beat renders stacked and visible:
showing only the final one would have been losing content rather than reducing motion.

**About `foam`.** Kept and switchable. The headline is cut out of a solid ink panel covering the
viewport, so the footage behind it shows only through the letterforms. Everything else
stays dark and calm and the type is the one lit thing. On scroll the panel dissolves and
the footage takes the full screen for a beat before the page resumes.

Done as an SVG mask, not `background-clip: text`, because a CSS background cannot be a
video: a full-bleed rect painted in the page ink is masked by white-on-black text, which
knocks the glyphs out of it. Inline SVG text inherits document fonts, so it uses the real
display face. The visible headline is a mask and not text to a screen reader or a crawler,
so the same words are also present as an `sr-only` `<h1>`.

**It is built to take a generated video loop.** Point `heroFoam.video.src` in
`src/data/content.ts` at a file in `public/`, for example `/hero/foam-loop.mp4`. Until
then it uses a photograph with a slow push, and the composition, mask and scroll moment are
identical either way, so nothing is blocked waiting on the asset. Recommended loop: 8 to
12 seconds, seamless, silent, H.264 MP4 around 1920x1080, under ~4 MB, ideally a macro of
foam expanding into a cavity. Movement has to read inside narrow letterforms, so tight
detail beats a wide shot.

**About `editorial`.** Kept and switchable. Light surface, split composition, type as the
subject. Being the only light surface on the site it declares itself by setting
`data-hero-tone="light"` on the document element, and the header takes its dark blurred
treatment in response, because its palette is light-on-dark and its wordmark would
otherwise disappear into the bone background.

### Content lives in `src/data`

No user-facing copy is written inside JSX. Components import typed data and map over it,
so the site can be re-worded without touching a component. `src/data/content.ts` holds
section-level editorial copy; the other files hold the structured records.

---

## How the motion is wired

**One animation loop.** Lenis runs with `autoRaf: false` and is stepped from
`gsap.ticker` in `App.tsx`; `ScrollTrigger.update` is driven from Lenis's scroll event.
A single loop with fixed frame ordering is what keeps scrubbed animations from jittering
against the smooth scroll.

**Scoped cleanup.** Every animation is built inside `useGSAP({ scope: ref })`, so
timelines and ScrollTriggers are reverted on unmount. Nothing is left dangling when a
route changes. Anything created outside GSAP's context (the marquee's `gsap.ticker`
callback, `gsap.matchMedia`) is torn down in an explicit returned cleanup.

**Reduced motion is a real branch, not a faster animation.** `useReducedMotion` gates
every timeline; when it is on, the finished state renders directly and no ScrollTrigger,
pin or parallax is created. `StatBand` renders its true values in JSX and only rewinds
them to zero when it is allowed to animate, so the numbers are correct either way. A CSS
`@media (prefers-reduced-motion: reduce)` block backs this up for transitions.

**"The Seal" hero (`HeroSeal.tsx` + `three/SealScene.tsx`)**

One pinned ScrollTrigger scrubs one timeline for 350% of viewport height. That timeline
animates a plain object holding scroll progress, which the R3F scene reads in `useFrame`,
and in the same pass drives the DOM overlays. So copy and camera share a single source of
timing, and scrolling causes **zero React re-renders**. Beat windows live in
`heroSeal.beats` as start/end fractions, so retiming is a data edit.

- Camera follows hand-placed waypoints with piecewise smootherstep, not a Catmull-Rom
  spline: a spline reparameterises by arc length and drifts the beats out of sync with
  the labels that name them.
- The count-up is *on* the scrubbed timeline, so the number climbs and falls with scroll
  rather than firing once.
- Cladding and battens part sideways and fade as the camera pushes through.
- Cold particles stream at the wall and stop dead at the foam; warm particles are held on
  the interior side; a ghosted batts panel leaks heat beside the sealed wall at beat 3.
- Foam carries a canvas-generated value-noise **normal map** so it catches light as cured
  material rather than a flat slab. No image assets at all.
- The camera crossing through solid geometry is covered by a brief warm blackout. A camera
  inside a mesh renders its interior faces as a smear; owning the moment costs one DOM
  tween instead of a transparency dance across four materials.

**Highlights**
- **Hero: a thermal camera.** An insulation company sells something invisible, so the
  hero lets you see it. A thermal lens floats over the photograph of the house and reveals
  a heat-mapped version underneath, drifting on its own from load and following the
  pointer the moment you move. The heat map is a real gradient map (an SVG
  `feComponentTransfer` LUT in `ThermalFilter.tsx`), not a CSS hue-rotate, which is why the
  lit windows read as genuine hot spots. The lens is driven by CSS custom properties
  updated from one `gsap.ticker` callback, so pointer movement never re-renders React.
  Its chrome is deliberately a sibling of the thermal layer inside the photo element so
  both share a transform chain and the ring tracks the reveal exactly.
- Hero composition otherwise: Ken Burns push, scrubbed parallax plate, gradient scrim, and
  a masked line-by-line headline reveal with blur-to-focus.
- **3D: batts versus foam.** A section of wall with a rectangular inspection opening cut
  into the internal lining, so you look *into* the cavity and the full build-up reads on
  the cut edges from any angle. Free orbit via `OrbitControls`, with auto-rotate that
  yields on grab and resumes after a few seconds idle. A toggle swaps the cavity between
  batts and spray foam: with batts the heat finds the gaps around the undersized pieces
  and rises out in plumes; with foam there are no plumes at all and a warm room light
  comes up instead. Fully procedural, including a canvas-drawn stretcher-bond brick
  texture, so there is no asset to download or 404.
- Velocity-reactive marquees: speed scales with scroll velocity and follows scroll
  direction, decaying on the ticker (ScrollTrigger stops firing when scrolling stops, so
  decaying in its callback would freeze the strip mid-sprint).
- **`StageRing`**: the three build-up steps on a turntable. Cards sit on a cylinder facing
  outward, so all three are on screen at once and the two turned away present their reverse
  side. It turns continuously, stops while the pointer is over it, and can be thrown left
  or right by dragging. No arrows, no dots.

  Rotation is a single number advanced on the GSAP ticker rather than a tween, because idle
  spin, hover pause and drag momentum all write to the same value and a tween would fight
  the drag for it. Two things that had to be right: the radius is measured from the
  rendered width (too small overlaps the cards, too large throws them off screen, and the
  right value moves with the breakpoint), and the ring is pulled back by that same radius
  so the front card sits at z = 0. Without the pull-back, `translateZ` toward the camera
  magnifies the front card by `perspective / (perspective - z)`, which rendered it a third
  oversized and spilling out of its column. `touch-pan-y` keeps the page scrolling
  vertically while a horizontal drag turns the ring.
- `WhatIsSprayFoam` places its photograph second in DOM order, so a phone reads heading,
  photo, body, turntable; explicit grid placement puts the photo back in its own column on
  desktop. One image element, two reading orders.

  The two photographs no longer transition into each other. A clip wipe between them left
  a hard seam across two unrelated images at every mid-scroll position, and a cross-fade
  there is a muddy double exposure. They are simply two separate pictures now: one framed
  with a gentle drift and scale, one as a bordered inset card lifted off its corner. The
  inset is hidden below `sm`, where it would cover a third of the picture it sits on.

  The section is **not** pinned: the turntable runs
  on its own clock rather than on scroll progress, so holding the page still bought nothing
  and cost the visitor an extra screen of scrolling. The photograph wipe and parallax run
  on the section's own travel through the viewport instead.
- Magnetic hover on primary CTAs, disabled on coarse pointers.
- Benefit cards tilt in a shared perspective and pull toward the cursor, on fine pointers
  only. Services photographs take an accent wipe on hover. Stat figures draw an underline
  behind the count-up. The FAQ toggle morphs plus to minus by collapsing the vertical bar
  (a rotated plus is a cross, not a minus). The closing CTA's accent word stretches and
  leans on scrub. Client wordmarks go monochrome to accent one at a time on hover.
- Testimonial cards parallax against their slide, written straight to style on Embla's own
  scroll event so dragging never round-trips through React state.

**Page-load intro** (`IntroCurtain.tsx`) is built but **off by default**, via
`INTRO_CURTAIN` in `src/config.ts`. It is an opaque panel in front of the hero, so it
delays Largest Contentful Paint by roughly its own duration. That is a real Lighthouse
cost for a moment of theatre, so it is opt-in rather than switched on quietly. When
enabled it runs once per browser session and never under reduced motion.

---

## Performance

Three.js and Embla are split into their own chunks and are not part of the initial
payload. The 3D canvas in the insulation section is additionally gated on an
IntersectionObserver with a generous `rootMargin`, so the Three.js chunk is not even
requested until the section is near.

**"The Seal" hero never loads WebGL on compact viewports.** Below 1024px, and under
`prefers-reduced-motion`, it renders a stepped walk through the same five layers using the
flat SVG cross-section, with no pin and no Canvas. Verified in a headless run: at 390x844
and 768x1024 the page requests **zero** Three.js chunks and mounts no canvas, while at
1440x900 it loads the scene as expected. The same SVG is the Suspense poster on desktop,
so first paint shows the real subject rather than a spinner and the swap to 3D is not a
change of content.

Approximate gzipped initial payload: ~100 KB JS (React + Router + GSAP) + ~7 KB CSS.
Three.js (~236 KB gz) loads only on demand.

Images are served from the Unsplash CDN with `auto=format` (AVIF/WebP where supported)
and responsive `srcSet`/`sizes`. `<Figure>` renders a branded placeholder if a request
fails, so a dead URL degrades gracefully rather than showing a broken image.

---

## Accessibility

- Semantic landmarks, skip-to-content link, visible branded focus ring everywhere.
- Mobile drawer is a real dialog: `aria-modal`, focus moved in on open, focus trapped on
  Tab, Escape closes and returns focus to the toggle, page scroll locked via Lenis.
- FAQ accordion: `aria-expanded` / `aria-controls`, each panel a labelled region. Closed
  panels are `visibility: hidden`, which also removes their content from the tab order.
  Each toggle refreshes ScrollTrigger because the document height changes.
- Carousel: `aria-roledescription="carousel"`, slides labelled "n of m", arrow-key
  support, and a polite live region announcing the active slide. Slides are deliberately
  **not** `aria-hidden`, because it is a multi-slide viewport, so neighbours are genuinely visible.
- Every image carries meaningful alt text. Decorative marquee copies are `aria-hidden`
  with a single static screen-reader equivalent.

Verified in a headless Chromium pass: no console errors, drawer keyboard behaviour
correct, and under `prefers-reduced-motion` nothing is left invisible by a skipped
entrance animation.

### Responsive verification

An automated pass runs the homepage at 13 viewports, from 2560x1440 down to 360x640,
including wide-but-short desktop sizes such as 1897x912. At every one it asserts:

- no horizontal page overflow (`scrollWidth === innerWidth`)
- no pinned section taller than the viewport
- the hero's primary CTA sits above the fold
- no text clipped by an `overflow: hidden` ancestor, measured after all entrance
  animations have settled
- the hero's primary CTA is checked at scroll 0 and against **both** hero variants'
  selectors, including the compact fallback

All pass. Display type is sized with `min()` of a `vw` and a `vh` term so headings shrink
on short viewports instead of pushing CTAs and pinned content off screen.

---

## Things the client needs to supply

Most of the original list is done: the brand palette, logo, social links, contact
form, gallery, blog, testimonials and technical documents are all real and in
place. What is still outstanding, as of September 2026:

1. **Trading hours.** `site.hours` in `src/data/site.ts` is a plausible trades week,
   not a confirmed one. The phone assistant and the structured data both read it.
2. **Five stock photographs** still stand in for situations there is no job photo
   of. They are marked `clientSwap: true` in `src/data/content.ts`, and the last page
   of the gallery photo notes document lists them for Glenn.
3. **Gallery captions.** Every caption describes only what is visible in the frame.
   Glenn is filling in what each job actually was, in the shared document.
4. **Two of Glenn's own fact-sheet PDFs** (LD-C-50 and the MD-R-200 MSDS) return 404 on
   his current site, so they are not in `public/docs/` yet.
5. **The Systemations values** the CRM messages read from: the lead webhook and the
   booking calendar URL go in the `SITE CONFIGURATION` block in `index.html` at deploy
   time. See DEPLOY.md and CRM-MESSAGING.md §2.
6. **`noindex, nofollow`** is on while the site sits on the staging domain. It comes off
   at go-live by setting `staging: false` in the same config block.

All business content (address, phone number, capability line, testimonials quoted
from the client's own site, FAQ answers, the customer-stated energy figures) is real
and used as supplied.

---

Built by [Systemations](https://systemations.ai).
