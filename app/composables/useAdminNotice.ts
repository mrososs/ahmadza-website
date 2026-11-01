export interface AdminNotice {
  tone: 'success' | 'error'
  message: string
}

/** One-shot message that survives a route change (e.g. "saved" after redirecting to the list). */
export function useAdminNotice() {
  const notice = useState<AdminNotice | null>('admin-notice', () => null)
  const push = (tone: AdminNotice['tone'], message: string) => { notice.value = { tone, message } }
  const clear = () => { notice.value = null }
  return { notice, push, clear }
}

export function errorMessage(cause: unknown, fallback = 'حدث خطأ غير متوقع. حاول مرة أخرى.'): string {
  return cause instanceof Error && cause.name === 'AdminError' ? cause.message : fallback
}
