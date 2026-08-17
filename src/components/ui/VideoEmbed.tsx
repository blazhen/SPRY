import { useState } from 'react'
import { Play } from 'lucide-react'

import type { Video } from '@/data/videos'

interface VideoEmbedProps {
  id: string
  title: string
  /** Verified poster name for this upload. See the note on `Video.poster`. */
  poster: Video['poster']
  className?: string
  /** Larger play target, for a single featured video. */
  featured?: boolean
}

/**
 * Click-to-load YouTube embed.
 *
 * A YouTube iframe pulls roughly a megabyte of player before anyone presses
 * play, so the homepage would carry seven of them on first paint. Instead this
 * renders the poster frame as a button and only creates the iframe on click,
 * with `autoplay` so the click that loads it is also the click that starts it.
 *
 * Posters come from `i.ytimg.com` at the resolution each upload actually has,
 * recorded per video rather than guessed. `hqdefault` and `sddefault` are 4:3
 * with the 16:9 frame letterboxed inside, so the image is cropped with
 * `object-cover`, which recovers exactly the video area.
 *
 * Two traps live here, both handled by the guard below. A missing
 * `maxresdefault` is not a 404: YouTube answers 200 with a 120x90 grey
 * placeholder, so `onError` never fires and the card would silently render a
 * grey box. And `sddefault` is sometimes a different frame from the chosen
 * thumbnail. So any poster that arrives suspiciously small is swapped for
 * `hqdefault`, which is always present and always the real thumbnail.
 *
 * `youtube-nocookie.com` keeps the request out of the visitor's ad profile
 * until they actually choose to watch.
 */
export default function VideoEmbed({
  id,
  title,
  poster,
  className = '',
  featured = false,
}: VideoEmbedProps) {
  const HQ = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  const [playing, setPlaying] = useState(false)
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${id}/${poster}.jpg`)

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-lg border border-line/10 bg-ink-800 ${className}`}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 size-full cursor-pointer"
        >
          <img
            src={src}
            alt=""
            aria-hidden="true"
            onError={() => setSrc(HQ)}
            onLoad={(e) => {
              // A real poster is at least 320px wide. Anything smaller is
              // YouTube's grey "no rendition" placeholder, served as a 200.
              if (e.currentTarget.naturalWidth <= 120 && src !== HQ) setSrc(HQ)
            }}
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />

          {/* Scrim: keeps the play control legible over any frame. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/10 transition-opacity duration-500 group-hover:opacity-80"
          />

          <span
            aria-hidden="true"
            className={`absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-ink shadow-lift transition-transform duration-500 ease-expo group-hover:scale-110 ${
              featured ? 'size-20' : 'size-14'
            }`}
          >
            <Play className={featured ? 'ml-1 size-8' : 'ml-0.5 size-6'} fill="currentColor" />
          </span>

          <span className="sr-only">Play video: {title}</span>
        </button>
      )}
    </div>
  )
}
