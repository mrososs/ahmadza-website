export function formatArabicDate(value: string): string {
  return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return 'المدة غير محددة'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours} س ${minutes} د` : `${minutes} دقيقة`
}
