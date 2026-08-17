/**
 * Site-level switches.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  HERO A/B
 * ─────────────────────────────────────────────────────────────────────────
 * Three complete heroes are built and all are production-ready. Change this
 * one value to swap which renders on the homepage.
 *
 *   'house'   → HeroHouse.tsx    Pinned house cutaway, sealed zone by zone
 *                               while the real meter reading counts down.
 *   'spray'   → HeroSpray.tsx    Pinned wall cavity that the visitor fills by
 *                               scrolling. The scroll applies the foam.
 *   'foam'    → HeroFoam.tsx     Headline knocked out of an ink panel, with
 *                               footage playing inside the letterforms.
 *   'editorial'→ HeroEditorial.tsx Light, split-screen, type-led. No photograph
 *                               behind the type and no drag mechanic.
 *   'comfort' → HeroComfort.tsx  The same room either side of a drag divider:
 *                               one cold winter, one warm one. Sells the
 *                               outcome rather than the mechanism.
 *   'thermal' → Hero.tsx        A thermal camera lens you drag over the house,
 *                               revealing a heat-mapped view underneath.
 *   'seal'    → HeroSeal.tsx    A pinned scroll-through of a wall cross-section:
 *                               cold outside → sealed → warm inside.
 *
 * Nothing else needs to change. They all use the same data, tokens and CTAs.
 *
 * Every variant is also viewable on its own at /heroes, one page each.
 */
export const ACTIVE_HERO:
  | 'house'
  | 'spray'
  | 'foam'
  | 'editorial'
  | 'comfort'
  | 'thermal'
  | 'seal' = 'house'

/**
 * Brief brand wipe on first load.
 *
 * Not the loading screen. That one lives inline in index.html, because a React
 * component cannot paint until the bundle it is part of has already arrived.
 * This is a separate flourish that runs after the app is up, so switching both
 * on means the visitor sits through two panels in a row. Leave it off unless
 * that is genuinely what is wanted.
 *
 * Disabled by default: an opaque full-screen overlay sits in front of the hero
 * and therefore delays Largest Contentful Paint by roughly its own duration.
 * It is a real trade of a Lighthouse point for a moment of theatre, so it is
 * opt-in rather than on by default. It never runs under prefers-reduced-motion
 * and only runs once per browser session.
 */
export const INTRO_CURTAIN = false
