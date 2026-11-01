import type { ContentDraft, FieldErrors } from '~/types/admin'
import { validateDraft } from '~/utils/admin-content'

/** Validation, saving, and post-save navigation shared by the "new" and "edit" pages. */
export function useContentEditor(draft: Ref<ContentDraft>, id?: string) {
  const errors = ref<FieldErrors>({})
  const saving = shallowRef(false)
  const { push } = useAdminNotice()

  async function save() {
    errors.value = validateDraft(draft.value)
    if (Object.keys(errors.value).length) {
      await nextTick()
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
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
