import { defaultSiteBranding } from '~/utils/branding'
import type { BrandingImage } from '~/types/branding'

/**
 * The page every visitor gets while the site is in maintenance.
 *
 * It is plain HTML and CSS built here, not a Nuxt page, on purpose: it must render when Nuxt, Supabase or the client bundle
 * cannot, it ships no JavaScript, and its response carries no runtime config (so no Supabase URL or key). Colors, fonts and
 * artwork are the site's own (the masthead's charcoal #1f1d39, AlMohanad, the warm-white calligraphic logo from /public).
 */

const siteName = 'موقع أحمد الزهراني'
const heading = 'قريبًا بإذن الله'
const message = 'نعمل حاليًا على تجهيز الموقع وتطوير محتواه، ونسعد بزيارتكم عند إطلاقه قريبًا بإذن الله.'

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll('\'', '&#39;')

// An eight-pointed star (two squares, one turned 45°) as a tiling, drawn in the logo's brass. Inline, so it costs no request.
const latticeTile = '<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'96\' height=\'96\' viewBox=\'0 0 96 96\' fill=\'none\' stroke=\'%23c9a45c\' stroke-width=\'1.2\'>'
  + '<path d=\'M20 20h56v56H20z\'/><path d=\'M48 8.4 87.6 48 48 87.6 8.4 48z\'/><circle cx=\'48\' cy=\'48\' r=\'4\'/></svg>'

const styles = `
@font-face{font-family:"AlMohanad";src:url("/fonts/AlMohanad-Regular.ttf") format("truetype");font-style:normal;font-weight:400;font-display:swap}
:root{--ink:#1f1d39;--cream:#eee5cb;--muted:#cfc8b4;--quiet:#b9b2a1;--brass:#e98a00;--line:rgb(201 164 92 / .4)}
*,*::before,*::after{box-sizing:border-box}
html{background:var(--ink);color-scheme:dark;-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;background:var(--ink);color:var(--cream);font-family:"AlMohanad","Noto Naskh Arabic","Geeza Pro","Segoe UI",Tahoma,serif;line-height:1.9}
.soon{position:relative;isolation:isolate;flex:1;display:grid;place-items:center;padding:clamp(1.5rem,5vw,3.5rem) clamp(1.25rem,4vw,3rem)}
.soon::before{content:"";position:absolute;inset:0;z-index:-1;background-image:url("data:image/svg+xml,${latticeTile}");background-size:96px 96px;background-position:center;opacity:.1}
.soon__frame{width:min(100%,38rem);padding:clamp(2rem,7vw,3.75rem) clamp(1.25rem,5vw,3.25rem);border:1px solid var(--line);outline:1px solid var(--line);outline-offset:6px;background:var(--ink);text-align:center}
.soon__logo{display:block;width:min(100%,21rem);height:auto;margin-inline:auto}
.soon__rule{display:flex;align-items:center;gap:.75rem;max-width:15rem;margin:clamp(1.25rem,4vw,1.75rem) auto;color:var(--brass)}
.soon__rule::before,.soon__rule::after{content:"";flex:1;height:1px;background:var(--line)}
.soon__rule svg{flex:none;width:.75rem;height:.75rem}
h1{margin:0 0 .75rem;font-size:clamp(2.5rem,11vw,4.25rem);font-weight:400;line-height:1.3;text-wrap:balance;color:var(--cream)}
.soon p{max-width:30rem;margin:0 auto;font-size:clamp(1.1rem,3.7vw,1.3rem);line-height:2;color:var(--muted);text-wrap:pretty}
.soon-owner{display:flex;justify-content:center;padding:.25rem 1rem 1.25rem}
.soon-owner a{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding-inline:1rem;color:var(--quiet);font-size:.95rem;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:.35em;transition:color .16s ease-out,text-decoration-color .16s ease-out}
.soon-owner a:hover{color:var(--cream);text-decoration-color:currentcolor}
.soon-owner a:focus-visible{color:var(--cream);outline:3px solid var(--brass);outline-offset:3px;text-decoration-color:currentcolor}
@media (prefers-reduced-motion:reduce){.soon-owner a{transition:none}}
`

export function renderComingSoonPage(logo: BrandingImage): string {
  const logoAlt = logo.alt || siteName
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${heading} | ${siteName}</title>
<meta name="description" content="${escapeHtml(message)}">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#1f1d39">
<meta name="color-scheme" content="dark">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>${styles}</style>
</head>
<body>
<main class="soon" id="main-content">
  <div class="soon__frame">
    <img class="soon__logo" src="${escapeHtml(logo.url)}" alt="${escapeHtml(logoAlt)}" width="${logo.width}" height="${logo.height}">
    <div class="soon__rule" aria-hidden="true"><svg viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l6 6-6 6-6-6z"/></svg></div>
    <h1>${heading}</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</main>
<footer class="soon-owner"><a href="/admin/login">دخول المدير</a></footer>
</body>
</html>
`
}

/** Origin the logo is served from, so the page's CSP can allow exactly that and nothing else. */
export function logoOrigin(logo: BrandingImage): string | undefined {
  try {
    return new URL(logo.url).origin
  }
  catch {
    return undefined
  }
}

let logoCache: { logo: BrandingImage; expiresAt: number } | undefined

/** The owner-managed header logo when there is one, else the bundled artwork. Cached for a minute and never throws. */
export async function comingSoonLogo(): Promise<BrandingImage> {
  if (logoCache && logoCache.expiresAt > Date.now()) return logoCache.logo
  let logo = defaultSiteBranding().headerLogo
  try {
    logo = (await getContentRepository().getBranding()).branding.headerLogo
  }
  catch (cause) {
    console.error('[site-access] could not read the branding for the coming-soon page; using the bundled logo', cause)
  }
  logoCache = { logo, expiresAt: Date.now() + 60_000 }
  return logo
}

export function comingSoonHeaders(logo: BrandingImage): Record<string, string> {
  const origin = logoOrigin(logo)
  return {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': `default-src 'none'; img-src 'self' data:${origin ? ` ${origin}` : ''}; style-src 'unsafe-inline'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  }
}
