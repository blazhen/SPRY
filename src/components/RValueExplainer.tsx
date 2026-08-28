import { useRef } from 'react'
import { Check, X } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SectionHeading from '@/components/ui/SectionHeading'
import { rvalueClaim, rvalueCopy, rvalueIntro } from '@/data/rvalue'
import SectionBackdrop from '@/components/ui/SectionBackdrop'

/** Stud positions inside the cavity diagram, in viewBox units. */
const STUDS = [0, 80, 160, 240]

/**
 * R-value explainer.
 *
 * Two walls, the same rating, drawn side by side. The batts panel shows the
 * gaps that a cut product leaves and animates the air escaping through them in
 * the warm accent; the foam panel is continuous and sits in the cool accent.
 * That is also the clearest demonstration of why this palette carries two
 * accents: one colour for heat leaving, one for heat held.
 *
 * The headline percentage is gated behind `figuresApproved` in rvalue.ts.
 * Until that is set, the section makes the argument without the number, which
 * needs no substantiation because the mechanism itself is not in dispute.
 */
export default function RValueExplainer() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const approved = rvalueClaim.figuresApproved && rvalueClaim.source.trim().length > 0

  useGSAP(
    () => {
      if (reduced) return

      // Air escaping through the gaps in the batts wall. Continuous, because
      // the point is that it never stops.
      gsap.to('[data-leak]', {
        y: -26,
        opacity: 0,
        duration: 1.9,
        ease: 'power1.out',
        repeat: -1,
        stagger: { each: 0.28, repeat: -1 },
      })

      gsap.from('[data-rv-panel]', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.12,
        scrollTrigger: { trigger: scope.current, start: 'top 74%' },
      })
    },
    { scope, dependencies: [reduced] },
  )

  /**
   * One wall, in cross-section.
   *
   * Drawn from real materials rather than from the palette: plasterboard,
   * timber grain, glasswool fibre and foam cells. The earlier version tinted
   * every surface with the site accents, which made both walls read as the same
   * abstract diagram in two colours, and on the light palette they collapsed
   * into two pale washes with almost nothing to tell them apart. Materials look
   * like themselves here for the same reason the 3D building does.
   *
   * The accents still carry the argument, but only where the argument actually
   * is: the air leaking out of the cut wall. Everything else is just a wall.
   *
   * Every gradient and pattern id is suffixed with the variant, because both
   * walls render on the same page and SVG ids are document-global: sharing them
   * would silently give the second wall the first one's fills.
   */
  /**
   * One wall, in cross-section.
   *
   * Drawn from real materials rather than from the palette: plasterboard,
   * timber grain, glasswool fibre and foam cells. The earlier version tinted
   * every surface with the site accents, which made both walls read as the same
   * abstract diagram in two colours, and on the light palette they collapsed
   * into two pale washes with almost nothing to tell them apart. Materials look
   * like themselves here for the same reason the 3D building does.
   *
   * The one thing that is not a material colour is the heat leaving through the
   * gaps, and that is deliberately a fixed warm red rather than the site accent.
   * On the brand palette the accent is navy, and navy air escaping a wall reads
   * as water, not as heat. The hero house already uses this exact red for the
   * same idea, so the two agree.
   *
   * Every gradient and pattern id is suffixed with the variant, because both
   * walls render on the same page and SVG ids are document-global: sharing them
   * would silently give the second wall the first one's fills.
   */
  const wall = (variant: 'batts' | 'foam') => {
    const isBatts = variant === 'batts'
    const u = variant

    /* Wall build-up, in viewBox units. */
    const TOP = 13 // underside of the plasterboard
    const BOT = 187 // face of the sheathing
    const H = BOT - TOP

    /* Heat leaving. Fixed, not themed. Matches the hero house. */
    const HOT = '#E0452A'

    /*
      Per-cavity jitter. Four identical cavities read as a CAD drawing; real
      framing and a real install are never that tidy, and the whole point of the
      batts panel is that the install is where the rating goes wrong.
    */
    const JITTER = [0, 1.6, -1.2, 0.8]

    const battPath = (cx: number, i: number) => {
      const j = JITTER[i % 4]
      const top = TOP + 17 + j
      const bot = BOT - 17 - j
      return [
        'M' + (cx + 3) + ' ' + (top + 4),
        'C' + (cx + 9) + ' ' + (top - 3) + ' ' + (cx + 21) + ' ' + (top + 2) + ' ' + (cx + 31) + ' ' + (top - 1),
        'C' + (cx + 43) + ' ' + (top - 4) + ' ' + (cx + 53) + ' ' + (top + 3) + ' ' + (cx + 61) + ' ' + top,
        'L' + (cx + 61) + ' ' + (bot - 2),
        'C' + (cx + 51) + ' ' + (bot + 4) + ' ' + (cx + 39) + ' ' + (bot - 1) + ' ' + (cx + 28) + ' ' + (bot + 3),
        'C' + (cx + 18) + ' ' + (bot + 6) + ' ' + (cx + 9) + ' ' + bot + ' ' + (cx + 3) + ' ' + (bot + 2),
        'Z',
      ].join(' ')
    }

    /*
      The foam runs 2.5 units past the cavity on each side, over the face of the
      stud, and its edges wander. That overlap is the entire difference between
      the two drawings: a cut product stops at the timber, an expanding one
      presses into it and bonds.
    */
    const foamPath = (cx: number) => {
      const L = cx - 2.5
      const R = cx + 66.5
      return [
        'M' + L + ' ' + TOP,
        'C' + (L + 1.6) + ' 52 ' + (L - 1.1) + ' 98 ' + (L + 1) + ' 144',
        'C' + (L + 2) + ' 168 ' + (L - 0.6) + ' 180 ' + L + ' ' + BOT,
        'L' + R + ' ' + BOT,
        'C' + (R - 1.6) + ' 158 ' + (R + 1.1) + ' 118 ' + (R - 1) + ' 82',
        'C' + (R - 2) + ' 48 ' + (R + 0.6) + ' 28 ' + R + ' ' + TOP,
        'Z',
      ].join(' ')
    }

    return (
      <svg
        viewBox="0 0 336 200"
        className="h-auto w-full"
        role="img"
        aria-label={
          isBatts
            ? 'Cross-section of a stud wall filled with cut glasswool batts, showing gaps at every edge and around a pipe where air escapes'
            : 'Cross-section of a stud wall filled with spray foam, showing a continuous layer bonded to the studs with no gaps'
        }
      >
        <defs>
          {/* Sawn pine: warm, with grain running the length of the stud. */}
          <pattern id={'grain-' + u} width="16" height="46" patternUnits="userSpaceOnUse">
            <rect width="16" height="46" fill="#C08E52" />
            <path
              d="M3 0 C5.4 12 2.2 24 4.2 46"
              stroke="#A2703A"
              strokeWidth="1.3"
              fill="none"
              opacity="0.7"
            />
            <path
              d="M8.6 0 C10.6 14 7.6 27 9.6 46"
              stroke="#B0824A"
              strokeWidth="1"
              fill="none"
              opacity="0.55"
            />
            <path
              d="M13.2 0 C14.2 15 12.4 29 13.4 46"
              stroke="#9A6A34"
              strokeWidth="0.8"
              fill="none"
              opacity="0.45"
            />
          </pattern>

          {/* Glasswool. Spun fibre lying at an angle, lit from above. */}
          <pattern
            id={'fibre-' + u}
            width="15"
            height="15"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-19)"
          >
            <rect width="15" height="15" fill="#E4C46C" />
            <path d="M0 2.5 h15 M0 8 h15 M0 12.5 h15" stroke="#F4E2AC" strokeWidth="1.1" opacity="0.6" />
            <path d="M0 5 h15 M0 10.4 h15" stroke="#C9A44C" strokeWidth="0.75" opacity="0.4" />
            <path d="M0 14 h15" stroke="#FCF3D8" strokeWidth="0.55" opacity="0.42" />
          </pattern>

          {/* Closed-cell foam: packed bubbles, no direction to them. */}
          <pattern id={'cells-' + u} width="17" height="17" patternUnits="userSpaceOnUse">
            <rect width="17" height="17" fill="#F4E9CF" />
            <circle cx="4.2" cy="4" r="2.9" fill="#DCC48A" opacity="0.85" />
            <circle cx="12.4" cy="7.4" r="2.1" fill="#DCC48A" opacity="0.74" />
            <circle cx="7.4" cy="12.6" r="2.5" fill="#DCC48A" opacity="0.8" />
            <circle cx="15" cy="14.6" r="1.5" fill="#DCC48A" opacity="0.68" />
            <circle cx="1.6" cy="10.4" r="1.3" fill="#DCC48A" opacity="0.64" />
            <circle cx="3.3" cy="3.1" r="1" fill="#FFFBEE" opacity="0.9" />
            <circle cx="6.5" cy="11.7" r="0.85" fill="#FFFBEE" opacity="0.8" />
            <circle cx="11.6" cy="6.6" r="0.75" fill="#FFFBEE" opacity="0.75" />
          </pattern>

          {/* Plasterboard, papered face. */}
          <linearGradient id={'board-' + u} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F4F1EA" />
            <stop offset="0.7" stopColor="#E4DFD4" />
            <stop offset="1" stopColor="#CFC8B9" />
          </linearGradient>

          {/* Sheathing behind, in shade. */}
          <linearGradient id={'sheath-' + u} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8B8377" />
            <stop offset="0.3" stopColor="#9E968A" />
            <stop offset="1" stopColor="#7A7268" />
          </linearGradient>

          {/* The cavity is a recess, so it is darker at the top and bottom
              where the lining and the sheathing overhang it. */}
          <linearGradient id={'recess-' + u} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#241E15" stopOpacity="0.42" />
            <stop offset="0.14" stopColor="#241E15" stopOpacity="0" />
            <stop offset="0.86" stopColor="#241E15" stopOpacity="0" />
            <stop offset="1" stopColor="#241E15" stopOpacity="0.32" />
          </linearGradient>

          {/* Sheen across the foam, so it reads as a poured solid rather than
              a printed swatch. */}
          <linearGradient id={'sheen-' + u} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
            <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.06" />
            <stop offset="1" stopColor="#8A7746" stopOpacity="0.16" />
          </linearGradient>

          {/* Timber is not flat either: the face catches light on one edge. */}
          <linearGradient id={'studLight-' + u} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.32" />
            <stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="1" stopColor="#3A2410" stopOpacity="0.28" />
          </linearGradient>

          {/* Heat glowing out of the mouth of a gap. Strongest at the opening
              and gone a few units in, which is what makes the gap read as a
              hole with something coming out of it rather than as a brown
              stripe: the hole itself stays dark. */}
          <linearGradient id={'leakDown-' + u} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={HOT} stopOpacity="0.8" />
            <stop offset="1" stopColor={HOT} stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id={'leakUp-' + u} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={HOT} stopOpacity="0.8" />
            <stop offset="1" stopColor={HOT} stopOpacity="0.04" />
          </linearGradient>

          {/* Warm halo around an unsealed gap, so a leak looks like heat
              bleeding out rather than like a drawn outline. */}
          <radialGradient id={'leakGlow-' + u}>
            <stop offset="0" stopColor={HOT} stopOpacity="0.55" />
            <stop offset="0.6" stopColor={HOT} stopOpacity="0.22" />
            <stop offset="1" stopColor={HOT} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* --- The dark of the cavity, seen through any gap --- */}
        <rect x="0" y={TOP} width="336" height={H} fill="#584F44" />

        {/* --- Framing ---------------------------------------------------- */}
        {[...STUDS, 320].map((x) => (
          <g key={'stud-' + x}>
            <rect x={x} y={TOP} width="16" height={H} fill={'url(#grain-' + u + ')'} />
            <rect x={x} y={TOP} width="16" height={H} fill={'url(#studLight-' + u + ')'} />
          </g>
        ))}

        {/* --- Insulation, drawn over the stud faces so the foam can bond to
                them and the batts visibly cannot ------------------------- */}
        {STUDS.map((x, i) => {
          const cx = x + 16
          const cw = 64
          const j = JITTER[i % 4]
          const pipeX = cx + cw / 2
          const hasPipe = i === 1

          return (
            <g key={x}>
              <rect x={cx} y={TOP} width={cw} height={H} fill={'url(#recess-' + u + ')'} />

              {isBatts ? (
                <>
                  {/* Cut batt: short at both ends, narrow at both sides and
                      slumped, which is what a cut product looks like in a real
                      cavity after a winter in it. */}
                  <path d={battPath(cx, i)} fill={'url(#fibre-' + u + ')'} />
                  <path
                    d={battPath(cx, i)}
                    fill="none"
                    stroke="#B8912F"
                    strokeWidth="0.9"
                    opacity="0.5"
                  />
                  {/* Compression folds through the middle of the batt. */}
                  <path
                    d={'M' + (cx + 6) + ' ' + (76 + j) + ' q16 -4 30 0 q14 4 25 -1'}
                    fill="none"
                    stroke="#C7A144"
                    strokeWidth="1"
                    opacity="0.45"
                  />
                  <path
                    d={'M' + (cx + 5) + ' ' + (126 + j) + ' q18 4 32 -1 q12 -3 22 1'}
                    fill="none"
                    stroke="#C7A144"
                    strokeWidth="1"
                    opacity="0.38"
                  />

                  {/* The gaps are open, unlit cavity, so they are drawn dark.
                      The warmth goes on top of them as heat coming out, not
                      into them as a colour: filling the hole itself with the
                      accent turned it into a flat rust-coloured band that read
                      as dirt rather than as an opening. */}
                  <rect x={cx} y={TOP} width={cw} height={18 + j} fill="#3B342B" />
                  <rect x={cx} y={BOT - 17 - j} width={cw} height={17 + j} fill="#3B342B" />
                  <rect x={cx} y={TOP} width="3.5" height={H} fill="#3B342B" />
                  <rect x={cx + cw - 3.5} y={TOP} width="3.5" height={H} fill="#3B342B" />

                  <rect
                    x={cx}
                    y={TOP}
                    width={cw}
                    height={18 + j}
                    fill={'url(#leakDown-' + u + ')'}
                  />
                  <rect
                    x={cx}
                    y={BOT - 17 - j}
                    width={cw}
                    height={17 + j}
                    fill={'url(#leakUp-' + u + ')'}
                  />
                  <rect x={cx} y={TOP} width="3.5" height={H} fill={HOT} opacity="0.3" />
                  <rect x={cx + cw - 3.5} y={TOP} width="3.5" height={H} fill={HOT} opacity="0.3" />

                  {/* Air escaping. It never stops, which is the point. */}
                  <g data-leak>
                    <path
                      d={'M' + (cx + 16) + ' ' + (TOP + 12) + ' q6 -8 12 0 q6 8 12 0'}
                      fill="none"
                      stroke={HOT}
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  </g>
                  <g data-leak>
                    <path
                      d={'M' + (cx + 24) + ' ' + (BOT - 6) + ' q6 -8 12 0 q6 8 12 0'}
                      fill="none"
                      stroke={HOT}
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                  </g>
                </>
              ) : (
                <>
                  {/* Foam. One piece, over the stud faces, edge to edge. */}
                  <path d={foamPath(cx)} fill={'url(#cells-' + u + ')'} />
                  <path d={foamPath(cx)} fill={'url(#sheen-' + u + ')'} />
                  {/* The bond line where it has gripped the timber. */}
                  <path
                    d={foamPath(cx)}
                    fill="none"
                    stroke="#C3A45F"
                    strokeWidth="1.1"
                    opacity="0.55"
                  />
                </>
              )}

              {/* A service penetration through the middle cavity: the classic
                  place a cut product cannot seal and an expanding one can. */}
              {hasPipe && (
                <>
                  {isBatts ? (
                    <>
                      {/* Batts cut back around the pipe, leaving a ring of open
                          cavity that air runs straight through. */}
                      <circle cx={pipeX} cy="100" r="20" fill="#584F44" />
                      <circle cx={pipeX} cy="100" r="26" fill={'url(#leakGlow-' + u + ')'} />
                      <circle
                        cx={pipeX}
                        cy="100"
                        r="19.5"
                        fill="none"
                        stroke={HOT}
                        strokeWidth="1.3"
                        strokeDasharray="5 4"
                        opacity="0.8"
                      />
                      <g data-leak>
                        <path
                          d={'M' + (pipeX - 12) + ' 78 q6 -7 12 0 q6 7 12 0'}
                          fill="none"
                          stroke={HOT}
                          strokeWidth="2.3"
                          strokeLinecap="round"
                        />
                      </g>
                    </>
                  ) : (
                    /* Foam has closed around the pipe: a collar, not a gap. */
                    <>
                      <circle cx={pipeX} cy="100" r="15.5" fill={'url(#cells-' + u + ')'} />
                      <circle
                        cx={pipeX}
                        cy="100"
                        r="15.5"
                        fill="none"
                        stroke="#C3A45F"
                        strokeWidth="1"
                        opacity="0.7"
                      />
                    </>
                  )}

                  {/* The pipe itself. */}
                  <circle cx={pipeX} cy="100" r="11" fill="#9AA3AC" />
                  <circle cx={pipeX} cy="100" r="11" fill={'url(#studLight-' + u + ')'} />
                  <circle cx={pipeX} cy="100" r="6.6" fill="#4E575F" />
                  <path
                    d={'M' + (pipeX - 6.2) + ' 96 a7.6 7.6 0 0 1 6.4 -4.4'}
                    fill="none"
                    stroke="#D6DDE3"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                </>
              )}
            </g>
          )
        })}

        {/* --- Linings, drawn last so they sit in front of the cavity ----- */}
        <rect x="0" y="0" width="336" height={TOP} fill={'url(#board-' + u + ')'} />
        <rect x="0" y={TOP - 1.6} width="336" height="1.6" fill="#000000" opacity="0.24" />
        <rect x="0" y={BOT} width="336" height={200 - BOT} fill={'url(#sheath-' + u + ')'} />
        <rect x="0" y={BOT} width="336" height="1.6" fill="#000000" opacity="0.2" />
      </svg>
    )
  }

  const panel = (variant: 'batts' | 'foam') => {
    const isBatts = variant === 'batts'
    const copy = isBatts ? rvalueCopy.batts : rvalueCopy.foam
    return (
      <div
        data-rv-panel
        className={`rounded-xl border p-7 lg:p-8 ${
          isBatts ? 'border-accent/25 bg-ink-800' : 'border-accent2/30 bg-ink-800'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-h4 font-semibold text-bone">{copy.title}</h3>
          <span
            className={`rounded-pill px-3 py-1.5 text-eyebrow font-bold uppercase tracking-[0.14em] ${
              isBatts ? 'bg-accent text-ink' : 'bg-accent2 text-paper-fg'
            }`}
          >
            {rvalueClaim.ratedValue}
          </span>
        </div>

        <div className="mt-7 overflow-hidden rounded-md border border-line/10 bg-ink p-3">
          {wall(variant)}
        </div>

        <ul className="mt-7 space-y-3">
          {copy.points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-small text-bone-400">
              {isBatts ? (
                <X className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={3} aria-hidden="true" />
              ) : (
                <Check
                  className="mt-0.5 size-4 shrink-0 text-accent2-ink"
                  strokeWidth={3}
                  aria-hidden="true"
                />
              )}
              {point}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <section
      ref={scope}
      id="r-value"
      className="relative border-t border-line/6 bg-surface py-section"
      aria-labelledby="rvalue-heading"
    >
      <SectionBackdrop variant="cells" tone="both" />

      <div className="relative shell">
        <div className="max-w-3xl">
          <SectionHeading intro={rvalueIntro} headingId="rvalue-heading" />
        </div>

        {/* The two definitions, which is the actual argument. */}
        <div className="mt-14 grid gap-8 border-t border-line/10 pt-12 lg:grid-cols-2 lg:gap-14">
          <div data-rv-panel>
            <h3 className="text-eyebrow font-bold uppercase tracking-[0.2em] text-bone-400">
              {rvalueCopy.ratedLabel}
            </h3>
            <p className="mt-4 max-w-measure text-body text-bone-400">{rvalueCopy.ratedBody}</p>
          </div>
          <div data-rv-panel>
            {/* Deliberately the primary accent, not the secondary. At this
                size the brand green measures 1.78:1 on a light ground, which
                is unreadable; the column heading carries the contrast in its
                wording instead. */}
            <h3 className="text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
              {rvalueCopy.realLabel}
            </h3>
            <p className="mt-4 max-w-measure text-body text-bone-400">{rvalueCopy.realBody}</p>
          </div>
        </div>

        <div className="mt-12 grid gap-7 lg:grid-cols-2">
          {panel('batts')}
          {panel('foam')}
        </div>

        {approved ? (
          <p className="mt-12 max-w-3xl font-display text-h3 font-semibold leading-tight text-bone">
            In a real building, the sealed wall outperforms the rated-equal one by{' '}
            <span className="text-accent2-ink">
              {rvalueClaim.realWorldGain.low} to {rvalueClaim.realWorldGain.high}
              {rvalueClaim.realWorldGain.unit}
            </span>
            .
          </p>
        ) : (
          <p className="mt-12 max-w-3xl text-body text-bone-400">{rvalueCopy.pendingNote}</p>
        )}

        <p className="mt-6 max-w-measure text-small text-bone-400">{rvalueCopy.footnote}</p>

      </div>
    </section>
  )
}
