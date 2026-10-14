import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages project site: https://codewithevilxd.github.io/pippo/.
  base: '/pippo/',
  plugins: [react(), tailwindcss()],
  // dist/ is the published component, so the demo builds somewhere else.
  build: { outDir: 'site-build/pippo' },
})
