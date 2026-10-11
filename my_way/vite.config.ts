import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const base = process.env.VITE_BASE_PATH ?? '/Fractal-Maze/'
if (!base.startsWith('/') || !base.endsWith('/') || base.startsWith('//') || /[?#]/.test(base))
  throw new Error('VITE_BASE_PATH must be a local absolute path ending in /, such as / or /mazes/.')

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), {
    name: 'static-host-entry',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'" }, injectTo: 'head-prepend' }]
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' })
      this.emitFile({ type: 'asset', fileName: '404.html', source: `<!doctype html><html lang="en"><meta charset="utf-8"><title>Fractal Maze</title><script>location.replace(${JSON.stringify(base)}+'?route='+encodeURIComponent(location.pathname+location.search+location.hash))</script><a href="${base}">Open Fractal Maze</a></html>` })
    },
  }],
})
