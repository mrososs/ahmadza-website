export default defineEventHandler(async (event) => {
  const { url } = await resolveVideoAccess(event, 'download')
  return sendRedirect(event, url, 302)
})
