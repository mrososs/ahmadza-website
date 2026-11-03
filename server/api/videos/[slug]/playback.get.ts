export default defineEventHandler(async (event) => {
  const { url, expiresInSeconds } = await resolveVideoAccess(event, 'play')
  return { url, expiresInSeconds }
})
