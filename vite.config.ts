import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isVercel = Boolean(process.env.VERCEL)
const base = isVercel ? '/' : (process.env.BASE_PATH || '/pippo/')
const outDir = isVercel ? 'site-build' : 'site-build/pippo'

export default defineConfig({
  // Vercel deploys to root (/), GitHub Pages to /pippo/
  base,
  plugins: [react(), tailwindcss()],
  // dist/ is the published component, so the demo builds somewhere else.
  build: { outDir },
})

