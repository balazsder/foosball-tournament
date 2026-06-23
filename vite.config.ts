import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset URLs relative so the same build works on
// GitHub Pages (project subpath), Vercel, Netlify, or a local file server.
export default defineConfig({
  plugins: [react()],
  base: './',
})
