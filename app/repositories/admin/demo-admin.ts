import { demoCategories, demoContent } from '~/data/demo-content'
import { contentTypes, type ContentType, type PublishStatus } from '~/types/content'
import type { AdminCategory, AdminContentFilter, AdminContentRecord, AdminContentSummary, AdminProfile, AdminStats, ContentDraft } from '~/types/admin'
import { publishStatuses } from '~/types/admin'
import { cleanSections, itemToDraftFields } from '~/utils/admin-content'
import { AdminError, type AdminAuth, type AdminBackend, type AdminRepository, type CategoryInput } from '~/repositories/admin/admin-repository'

/** Development-only sandbox: in-memory, resets on reload, and never reachable in production builds. */
const demoProfile: AdminProfile = { userId: 'demo-admin', email: 'demo@example.invalid', displayName: 'مدير تجريبي', role: 'owner' }

class DemoAdminAuth implements AdminAuth {
  readonly source = 'demo'
  private signedIn = false
  async restore() { return this.signedIn ? demoProfile : null }
  async signIn() { this.signedIn = true; return demoProfile }
  async signOut() { this.signedIn = false }
  async requestPasswordReset() { /* no mail is sent in the demo sandbox */ }
  async completeRecovery() { return this.signedIn }
  async updatePassword() { this.signedIn = true; return demoProfile }
}

class DemoAdminRepository implements AdminRepository {
  readonly source = 'demo'
  private readonly records = new Map<string, AdminContentRecord & { updatedAt: string }>()
  private readonly categories = new Map<string, AdminCategory>()

  constructor() {
    demoCategories.forEach((category, index) => {
      this.categories.set(category.id, { id: category.id, slug: category.slug, name: category.name, description: '', sortOrder: index, active: true })
    })
    for (const item of demoContent) {
      this.records.set(item.id, {
        id: item.id,
        type: item.type,
        slug: item.slug,
        title: item.title,
        excerpt: item.excerpt,
        sections: item.sections.map(section => ({ ...section, heading: section.heading ?? '', paragraphs: [...section.paragraphs] })),
        status: item.status,
        publishedAt: item.publishedAt.slice(0, 16),
        scheduledAt: '',
        featured: item.featured,
        readingMinutes: item.readingMinutes ? String(item.readingMinutes) : '',
        seoTitle: item.seoTitle ?? '',
        seoDescription: item.seoDescription ?? '',
        categoryIds: item.categories.map(category => category.id),
        updatedAt: item.updatedAt,
        ...itemToDraftFields(item),
      })
    }
  }

  private summaries(): AdminContentSummary[] {
    return [...this.records.values()]
      .map(record => ({ id: record.id, type: record.type, slug: record.slug, title: record.title, status: record.status, featured: record.featured, publishedAt: record.publishedAt || null, updatedAt: record.updatedAt }))
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async stats(): Promise<AdminStats> {
    const items = this.summaries()
    const byType = Object.fromEntries(contentTypes.map(type => [type, 0])) as Record<ContentType, number>
    const byStatus = Object.fromEntries(publishStatuses.map(status => [status, 0])) as Record<PublishStatus, number>
    for (const item of items) {
      byType[item.type] += 1
      byStatus[item.status] += 1
    }
    return { total: items.length, byType, byStatus, recent: items.slice(0, 6) }
  }

  async listContent(filter: AdminContentFilter = {}) {
    const needle = filter.query?.trim()
    return this.summaries()
      .filter(item => !filter.type || item.type === filter.type)
      .filter(item => !filter.status || item.status === filter.status)
      .filter(item => !needle || item.title.includes(needle))
  }

  async getContent(id: string) {
    const record = this.records.get(id)
    return record ? structuredClone(record) : null
  }

  async saveContent(draft: ContentDraft, id?: string) {
    const clash = [...this.records.values()].some(record => record.type === draft.type && record.slug === draft.slug && record.id !== id)
    if (clash) throw new AdminError('الرابط المختصر مستخدم من قبل، اختر رابطًا آخر.')
    const key = id ?? crypto.randomUUID()
    const publishedAt = draft.status === 'published' && !draft.publishedAt ? new Date().toISOString().slice(0, 16) : draft.publishedAt
    this.records.set(key, { ...JSON.parse(JSON.stringify(draft)) as ContentDraft, sections: cleanSections(draft.sections), publishedAt, id: key, updatedAt: new Date().toISOString() })
    return key
  }

  async deleteContent(id: string) {
    this.records.delete(id)
  }

  async listCategories() {
    return [...this.categories.values()].toSorted((left, right) => left.sortOrder - right.sortOrder)
  }

  async saveCategory(input: CategoryInput, id?: string) {
    const key = id ?? crypto.randomUUID()
    this.categories.set(key, { id: key, ...input })
  }
}

export function createDemoAdminBackend(): AdminBackend {
  return { auth: new DemoAdminAuth(), repository: new DemoAdminRepository() }
}
