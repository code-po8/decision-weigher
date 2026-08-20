import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The public base path is deploy-driven, never hard-coded:
//   - unset (local dev, root-hosted Docker/custom domain) → '/'
//   - GitHub Pages (served from /<repo>/) → PUBLIC_BASE_PATH=/decision-weigher/
// The router reads the resolved value back via import.meta.env.BASE_URL, so the
// app's base is configured in exactly one place (this env var) per deploy.
// https://vite.dev/config/
export default defineConfig({
  base: process.env.PUBLIC_BASE_PATH ?? '/',
  plugins: [react()],
})
