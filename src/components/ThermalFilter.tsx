/**
 * Thermal-imaging colour lookup, as an SVG filter.
 *
 * Desaturates the photograph, then maps luminance onto a thermal ramp with
 * feComponentTransfer: cold navy → violet → magenta → red → orange → white hot.
 * This is a real gradient map rather than a CSS hue-rotate approximation, which
 * is why the lit windows and roofline read as genuine hot spots.
 *
 * Rendered once, hidden. Referenced with `filter: url(#thermal-lut)`.
 */
export default function ThermalFilter() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      className="pointer-events-none absolute size-0"
    >
      <defs>
        <filter id="thermal-lut" colorInterpolationFilters="sRGB">
          {/* Luminance only. */}
          <feColorMatrix type="saturate" values="0" />
          {/* Lift midtones so interiors separate from the night sky. */}
          <feComponentTransfer>
            <feFuncR type="gamma" exponent="0.78" />
            <feFuncG type="gamma" exponent="0.78" />
            <feFuncB type="gamma" exponent="0.78" />
          </feComponentTransfer>
          {/* The ramp. Six stops, cold to white hot. */}
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.04 0.24 0.62 0.95 1 1" />
            <feFuncG type="table" tableValues="0.02 0.04 0.14 0.55 0.88 1" />
            <feFuncB type="table" tableValues="0.20 0.48 0.44 0.10 0.22 0.82" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  )
}
