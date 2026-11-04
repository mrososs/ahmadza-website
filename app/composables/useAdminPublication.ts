/** One shared read of the publication state for every admin page that shows it (dashboard summary and the settings panel). */
export function useAdminPublication() {
  return useAsyncData('admin-publication', async () => (await useAdminRepository()).getPublication(), { server: false })
}
