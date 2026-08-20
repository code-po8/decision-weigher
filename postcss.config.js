// Tailwind v4 is wired through its PostCSS plugin. There is no tailwind.config
// file by default in v4 — configuration is CSS-first (see src/index.css, which
// imports "tailwindcss" and can declare theme tokens via @theme).
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
