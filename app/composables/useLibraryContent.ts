import type { ContentListResult } from '~/types/content'

// One shared request feeds the layout (ticker, video band) and the homepage sections.
export function useLibraryContent() {
  const requestFetch = useRequestFetch()
  return useAsyncData('library-content', () => requestFetch<ContentListResult>('/api/content', { query: { limit: 100 } }))
}
