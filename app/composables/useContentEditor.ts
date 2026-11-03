import type { ContentDraft, FieldErrors } from '~/types/admin'
import { validateDraft } from '~/utils/admin-content'
import { parseYoutubeInput, youtubeWatchUrl } from '~/utils/youtube'

/** Validation, saving, and post-save navigation shared by the "new" and "edit" pages. */
export function useContentEditor(draft: Ref<ContentDraft>, id?: string) {
  const errors = ref<FieldErrors>({})
  const saving = shallowRef(false)
  const { push } = useAdminNotice()

  async function save() {
    // A double click or Enter during a slow save must not insert the record twice.
    if (saving.value) return
    errors.value = validateDraft(draft.value)
    if (Object.keys(errors.value).length) {
      await nextTick()
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    // Whatever link shape was pasted, the record keeps (and the form shows) one canonical link.
    if (draft.value.type === 'video' && draft.value.videoSource === 'youtube') {
      const parsed = parseYoutubeInput(draft.value.youtubeId)
      if (parsed.ok) draft.value.youtubeId = youtubeWatchUrl(parsed.id)
    }

    saving.value = true
    try {
      const repository = await useAdminRepository()
      const savedId = await repository.saveContent(draft.value, id)
      push('success', id ? 'تم حفظ التعديلات.' : 'تمت إضافة المادة.')
      await navigateTo(id ? '/admin/content' : `/admin/content/${savedId}`)
    }
    catch (cause) {
      if (!(cause instanceof Error && cause.name === 'AdminError')) console.error('[admin] unexpected save failure', cause)
      push('error', errorMessage(cause, 'تعذر حفظ المادة. حاول مرة أخرى.'))
      window.scrollTo({ top: 0 })
    }
    finally {
      saving.value = false
    }
  }

  return { errors, saving, save }
}
