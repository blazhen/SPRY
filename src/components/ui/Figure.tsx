import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { unsplash, unsplashSrcSet, type ImageAsset } from '@/lib/images'

interface FigureProps {
  image: ImageAsset
  /** `sizes` attribute: tells the browser how wide this renders, per breakpoint. */
  sizes?: string
  /** Above-the-fold images opt out of lazy loading. */
  priority?: boolean
  className?: string
  imgClassName?: string
  widths?: number[]
}

/**
 * Photograph with a graceful failure mode.
 *
 * Serves a responsive srcSet from the Unsplash CDN. If the request fails the
 * component swaps to a branded placeholder rather than leaving a broken image
 * icon. The layout never collapses and the alt text stays available to
 * assistive tech.
 */
export default function Figure({
  image,
  sizes = '100vw',
  priority = false,
  className = '',
  imgClassName = '',
  widths,
}: FigureProps) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (failed) {
    return (
      <div
        className={`relative grid place-items-center bg-ink-700 ${className}`}
        role="img"
        aria-label={image.alt}
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(120% 90% at 30% 15%, rgb(var(--c-accent) / 0.22), transparent 60%), linear-gradient(160deg, rgb(var(--c-ink-700)), rgb(var(--c-ink)))',
          }}
        />
        <ImageOff className="relative size-7 text-bone-400/60" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-ink-700 ${className}`}>
      {/* Shimmer placeholder until the bitmap decodes. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-ink-700 transition-opacity duration-700 ease-expo ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <img
        src={unsplash(image.id, widths ? widths[widths.length - 1] : 1600)}
        srcSet={unsplashSrcSet(image.id, widths)}
        sizes={sizes}
        alt={image.alt}
        loading={priority ? 'eager' : 'lazy'}
        // React 18 does not map camelCase `fetchPriority` onto the DOM. It
        // warns and drops it. Spread the real lowercase attribute instead.
        {...({ fetchpriority: priority ? 'high' : 'auto' } as Record<string, string>)}
        decoding={priority ? 'sync' : 'async'}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`size-full object-cover transition-opacity duration-700 ease-expo ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
      />
    </div>
  )
}
