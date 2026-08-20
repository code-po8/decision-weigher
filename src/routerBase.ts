// Derive the React Router `basename` from Vite's resolved base URL.
//
// Vite exposes the build-time `base` as `import.meta.env.BASE_URL`, always with
// a trailing slash (e.g. '/', '/decision-weigher/'). React Router wants a
// basename WITHOUT a trailing slash, except the root which stays '/'. Keeping
// this pure and separate makes the app's base come from a single source (the
// build's base) and keeps the normalization testable.

export function routerBasename(baseUrl: string): string {
  if (baseUrl === '' || baseUrl === '/') return '/'
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}
