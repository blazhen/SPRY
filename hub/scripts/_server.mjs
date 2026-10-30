// Starts `vite preview` on a port and waits until it answers, so the check scripts do not race it.
import { spawn } from 'node:child_process'

/** For the older scripts (smoke, tabprobe): starts a preview and returns { url, close }. */
export async function startStatic(port = 4310) {
  const server = await startPreview(port)
  return { url: `http://localhost:${port}/`, close: async () => { server.kill() } }
}

export async function startPreview(port) {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${port}/`)
      if (r.ok) return server
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  server.kill()
  throw new Error(`preview did not start on port ${port}`)
}
