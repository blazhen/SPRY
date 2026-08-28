import type { SectionIntro } from '@/data/content'

export interface Video {
  /** YouTube watch ID. */
  id: string
  /** Cleaned title. The raw channel titles carry hashtags and stray spacing. */
  title: string
  /** One line on what the clip actually shows. */
  blurb: string
  /**
   * Best poster YouTube actually generated for this upload, checked per video.
   *
   * `maxresdefault` only exists for HD uploads and `sddefault` is missing on
   * some too, so guessing high and falling back means a 404 on every page
   * load. Recording the verified name keeps the network log clean.
   */
  poster: 'maxresdefault' | 'sddefault' | 'hqdefault'
  /** Which page galleries this belongs in. */
  sector: 'residential' | 'commercial' | 'both'
}

/** The company channel, linked from the section footer. */
export const channelUrl = 'https://www.youtube.com/@SprayItSolutions'

/**
 * Customer testimonial.
 *
 * The only testimonial video on the channel, so it is presented on its own as
 * a named customer story rather than padded out into a row of one.
 */
export const testimonialVideo = {
  id: 'tiPjNsx0WYY',
  title: 'Icynene homeowner testimonial',
  blurb: 'A homeowner on what changed after their place was sprayed.',
  // Not sddefault: for this upload that rendition is a different frame
  // (a product shot) rather than the chosen thumbnail.
  poster: 'hqdefault',
  sector: 'both',
} satisfies Video

export const workIntro: SectionIntro = {
  eyebrow: 'On the tools',
  headingLines: ['See it', 'going in.'],
  accentWord: 'going',
  lede: 'Real jobs filmed on site: walls, roofs, subfloors and structures batts cannot follow. No stock footage.',
}

export const workCopy = {
  channelLabel: 'Watch more on YouTube',
  testimonialEyebrow: 'In their words',
}

/**
 * Work videos, ordered to show range rather than by view count: a wall, a whole
 * house, a roof, a subfloor, a specialist structure and one explainer.
 *
 * Every entry here is a true 16:9 upload. The channel's three most-watched
 * clips (spray foam trimming, brick veneer injection, factory roof) are
 * vertical Shorts, which YouTube only serves pillarboxed behind a blurred
 * fill; mixed into a landscape grid they read as broken rather than as a
 * deliberate format. They are one line away if the client wants them.
 */
export const workVideos: Video[] = [
  {
    id: 'N_ftWt3qjjM',
    title: 'Stud wall spraying',
    blurb: 'Time lapse of a residential wall filled cavity by cavity.',
    poster: 'sddefault',
    sector: 'residential',
  },
  {
    id: '8VLbxYIWyzI',
    title: 'Main Ridge house',
    blurb: 'A whole-house fit-out, wall cavities and framing.',
    poster: 'hqdefault',
    sector: 'residential',
  },
  {
    id: 'xO1WzJZxoUY',
    title: 'Roof spraying at R6.0',
    blurb: 'Open-cell Icynene LDC-50 under the roof line.',
    poster: 'maxresdefault',
    sector: 'residential',
  },
  {
    id: 'Zsicob298CI',
    title: 'High speed subfloor spraying',
    blurb: 'Underfloor coverage, the area most homes leave bare.',
    poster: 'maxresdefault',
    sector: 'residential',
  },
  {
    id: 'Ht_W3K2Rhi0',
    title: 'Inflated dome, PIR foam',
    blurb: 'A structure conventional batts could never follow.',
    poster: 'maxresdefault',
    sector: 'commercial',
  },
  {
    id: '52TYYHYkWb4',
    title: 'Is spray foam a good choice?',
    blurb: 'The short explainer on where it earns its keep.',
    poster: 'hqdefault',
    sector: 'residential',
  },

  /* Commercial and industrial. Every one of these was checked to be a true
     16:9 upload: the channel's factory-roof clip is a vertical Short and was
     left out rather than pillarboxed into a landscape grid. Posters are set to
     hqdefault, which always exists and is always the real chosen thumbnail. */
  {
    id: 'gOE23pCeQPc',
    title: 'Factory wall, time lapse',
    blurb: 'A full industrial span sprayed end to end.',
    poster: 'hqdefault',
    sector: 'commercial',
  },
  {
    id: 'XDYjdr9lJRo',
    title: 'Potato storage shed',
    blurb: 'Twin rigs on a controlled-temperature produce store.',
    poster: 'hqdefault',
    sector: 'commercial',
  },
  {
    id: 'QUGdEIRih8g',
    title: 'Wine shed walls',
    blurb: 'Holding temperature in a working winery store.',
    poster: 'hqdefault',
    sector: 'commercial',
  },
  {
    id: 'CR8CfFmON3g',
    title: 'Wine shed, interior',
    blurb: 'Sprayed directly onto the sheeting, no framing needed.',
    poster: 'hqdefault',
    sector: 'commercial',
  },
  {
    id: 'W61lMo3DB9w',
    title: 'Shipping container conversion',
    blurb: 'Closed cell foam turning a steel box into usable space.',
    poster: 'hqdefault',
    sector: 'commercial',
  },
]
