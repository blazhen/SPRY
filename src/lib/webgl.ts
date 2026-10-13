let cached: boolean | undefined

/**
 * Whether this browser can create a WebGL context at all.
 *
 * Checked before any 3D chunk is requested. WebGL can be missing or switched
 * off (disabled GPU, locked-down corporate browsers, some remote desktops, old
 * devices), and react-three-fiber throws "Error creating WebGL context" during
 * render when it is. Asking first means those visitors never download the 3D
 * code and get the plain 2D version of the section instead.
 *
 * The answer is cached: probing creates a context, and browsers cap how many
 * can exist at once. The probe context is released straight away.
 */
export function hasWebGL(): boolean {
  if (cached !== undefined) return cached
  if (typeof document === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as
      | WebGL2RenderingContext
      | WebGLRenderingContext
      | null
    cached = gl !== null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    cached = false
  }
  return cached
}
