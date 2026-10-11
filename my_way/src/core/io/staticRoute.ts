/** Restore the clean route after GitHub Pages serves the app's 404 redirect. */
export function staticRoute(search: string, origin: string, base: string): string | null {
  const route = new URLSearchParams(search).get('route')
  if (!route?.startsWith('/') || route.startsWith('//')) return null
  const url = new URL(route, origin)
  return url.origin === origin && url.pathname.startsWith(base)
    ? url.pathname + url.search + url.hash : null
}
