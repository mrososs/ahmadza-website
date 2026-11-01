import type { ContentListResult } from '~/types/content'

// One shared request feeds the layout (ticker, video band) and the homepage sections.
export function useLibraryContent() {
  return useAsyncData('library-content', () => $fetch<ContentListResult>('/api/content', { query: { limit: 50 } }))
}
