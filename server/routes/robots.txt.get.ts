// Dynamic on purpose: a static robots.txt would keep advertising the sitemap (or hiding the site) after a launch or a return to maintenance.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })

  // In maintenance crawlers stay allowed in: every page answers 503 with `noindex`, which they only see if they may fetch it
  // (a blanket Disallow would also leave anything already indexed in place). No sitemap is advertised until launch.
  if (await readPublicationMode() === 'maintenance') return 'User-agent: *\nDisallow: /admin\n'

  const siteUrl = useRuntimeConfig(event).public.siteUrl.replace(/\/$/, '')
  return `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${siteUrl}/sitemap.xml\n`
})
