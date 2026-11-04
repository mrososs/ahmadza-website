/**
 * Which requests the maintenance gate lets through untouched, and what it answers for the rest.
 *
 * `open` paths carry no content: the admin console shell (data is protected by RLS, not by this gate), build assets,
 * bundled artwork, the owner's logo, robots.txt and the preview-session endpoints (they authorize themselves).
 * Everything else is gated and answered according to what the caller expects: a page, an API, or a file.
 */
export type SiteRequestKind = 'open' | 'page' | 'api' | 'file'

const openExact = new Set(['/robots.txt', '/favicon.svg', '/api/branding', '/api/preview/session'])
const openPrefixes = ['/admin', '/_nuxt', '/_pdfjs', '/branding', '/fonts', '/ornaments']

const underPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

function classifyOne(path: string, dev: boolean): SiteRequestKind {
  if (openExact.has(path) || openPrefixes.some(prefix => underPrefix(path, prefix))) return 'open'
  // The dev server's own plumbing (vite-node, devtools) lives under /__ ; production builds drop this branch.
  if (dev && path.startsWith('/__')) return 'open'
  if (underPrefix(path, '/api')) return 'api'
  return /\.[a-z0-9]+$/i.test(path.slice(path.lastIndexOf('/') + 1)) ? 'file' : 'page'
}

/**
 * Every form of the path that something downstream might act on: the raw string the router matches, the same string with
 * dot segments resolved (`/_nuxt/../articles/x`), and its percent-decoded forms, each resolved again
 * (`/admin/..%2farticles/x` decodes to `/admin/../articles/x`). Returns null when the path is not one we can reason about.
 */
function pathForms(path: string): string[] | null {
  const forms = new Set<string>([path])
  let current = path
  try {
    for (let round = 0; round < 3; round++) {
      const resolved = new URL(`http://localhost${current}`).pathname
      forms.add(resolved)
      const decoded = decodeURIComponent(resolved)
      if (decoded === resolved) break
      // A decoded `?`, `#`, `\` or control character would change how the path is read once something decodes it; there is no legitimate use.
      // eslint-disable-next-line no-control-regex
      if (/[?#\\\u0000-\u001f\u007f]/.test(decoded)) return null
      forms.add(decoded)
      current = decoded
    }
  }
  catch {
    // Malformed encoding is never a legitimate allow-listed request.
    return null
  }
  return [...forms]
}

/**
 * A path is open only when EVERY form of it is open, so an allow-listed prefix can never smuggle a content route past the
 * gate. A gated path is answered in the shape of the most decoded form that is actually gated.
 */
export function classifySiteRequest(rawPath: string, options: { dev?: boolean } = {}): SiteRequestKind {
  const dev = options.dev === true
  const path = rawPath.split(/[?#]/, 1)[0] ?? ''

  const forms = pathForms(path)
  if (!forms) return 'page'

  const kinds = forms.map(form => classifyOne(form, dev))
  if (kinds.every(kind => kind === 'open')) return 'open'
  return kinds.toReversed().find(kind => kind !== 'open') ?? 'page'
}
