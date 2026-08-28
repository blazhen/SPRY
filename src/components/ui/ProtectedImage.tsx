import { useState } from 'react'

interface ProtectedImageProps {
  src: string
  alt: string
  className?: string
  /** Wrapper classes, e.g. an aspect ratio box. */
  frameClassName?: string
  /** Subtle repeating wordmark across the image. */
  watermark?: boolean
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
}

/**
 * Gallery image with casual-copy deterrents.
 *
 * WHAT THIS ACTUALLY DOES, so nobody is misled about it: it blocks the
 * right-click menu, the drag-to-desktop gesture and the long-press save sheet
 * on mobile, and it puts a transparent layer over the image so that even a
 * context menu forced open targets the overlay rather than the file. That
 * covers the way images are lifted in practice, which is someone right-clicking
 * and choosing Save As.
 *
 * WHAT IT CANNOT DO: the file is still downloaded by the browser, so anyone who
 * opens devtools, reads the network tab, disables JavaScript or simply takes a
 * screenshot still gets the image. No front-end technique changes that. If a
 * competitor is deliberately taking photos, the measures that actually bite are
 * the visible watermark below, publishing at display resolution rather than
 * full resolution, and a takedown notice.
 *
 * Deliberately scoped to gallery and project imagery. Disabling right-click
 * across the whole site punishes ordinary visitors, breaks "open link in new
 * tab", and interferes with assistive tools, for no extra protection.
 */
export default function ProtectedImage({
  src,
  alt,
  className = '',
  frameClassName = '',
  watermark = false,
  width,
  height,
  loading = 'lazy',
}: ProtectedImageProps) {
  const [loaded, setLoaded] = useState(false)
  const block = (event: React.SyntheticEvent) => event.preventDefault()

  return (
    <div
      className={`relative overflow-hidden ${frameClassName}`}
      onContextMenu={block}
      // Long-press on iOS and Android opens the same save sheet as a
      // right-click, and this is what suppresses it.
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        draggable={false}
        onDragStart={block}
        onContextMenu={block}
        onLoad={() => setLoaded(true)}
        className={`block size-full object-cover transition-opacity duration-700 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
      />

      {watermark && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none opacity-[0.14] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150'><text x='0' y='95' transform='rotate(-24 90 95)' font-family='Helvetica,Arial,sans-serif' font-size='22' font-weight='700' letter-spacing='2' fill='white'>SPRAY IT SOLUTIONS</text></svg>\")",
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      {/* Transparent capture layer. Sits above the image so a context menu
          opened over the picture targets this element, not the file. */}
      <span
        aria-hidden="true"
        onContextMenu={block}
        onDragStart={block}
        className="absolute inset-0 block"
      />
    </div>
  )
}
