import type { ContentListResult } from '~/types/content'

/** True only when the shared library request was served by the bundled demo repository. */
export function useIsDemoContent() {
  const { data } = useNuxtData<ContentListResult>('library-content')
  return computed(() => data.value?.source === 'demo')
}
