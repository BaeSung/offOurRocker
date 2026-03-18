import { randomUUID as uuid } from 'crypto'
import { eq, desc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { now, safeHandle } from './utils'

const MAX_VERSIONS_PER_CHAPTER = 50

export function registerVersionsHandlers(): void {
  const db = getDb()

  safeHandle(IPC.VERSIONS_LIST, async (_e, chapterId: string) => {
    return db
      .select()
      .from(schema.versions)
      .where(eq(schema.versions.chapterId, chapterId))
      .orderBy(desc(schema.versions.createdAt))
      .all()
  })

  safeHandle(
    IPC.VERSIONS_CREATE,
    async (_e, chapterId: string, label?: string) => {
      const chapter = db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.id, chapterId))
        .get()

      if (!chapter) return { success: false, error: 'Chapter not found' }

      const content = chapter.content || ''
      const charCount = content.replace(/\s/g, '').replace(/<[^>]*>/g, '').length

      const id = uuid()
      db.insert(schema.versions)
        .values({
          id,
          chapterId,
          content,
          charCount,
          label: label || null,
          createdAt: now(),
        })
        .run()

      // Prune old versions beyond limit
      const allVersions = db
        .select({ id: schema.versions.id })
        .from(schema.versions)
        .where(eq(schema.versions.chapterId, chapterId))
        .orderBy(desc(schema.versions.createdAt))
        .all()

      if (allVersions.length > MAX_VERSIONS_PER_CHAPTER) {
        const toDelete = allVersions.slice(MAX_VERSIONS_PER_CHAPTER)
        for (const v of toDelete) {
          db.delete(schema.versions)
            .where(eq(schema.versions.id, v.id))
            .run()
        }
      }

      return { success: true, id }
    }
  )

  safeHandle(IPC.VERSIONS_RESTORE, async (_e, versionId: string) => {
    const version = db
      .select()
      .from(schema.versions)
      .where(eq(schema.versions.id, versionId))
      .get()

    if (!version) return { success: false, error: 'Version not found' }

    // Save current content as a new version before restoring
    const chapter = db
      .select()
      .from(schema.chapters)
      .where(eq(schema.chapters.id, version.chapterId))
      .get()

    if (chapter) {
      const currentCharCount = (chapter.content || '').replace(/\s/g, '').replace(/<[^>]*>/g, '').length
      db.insert(schema.versions)
        .values({
          id: uuid(),
          chapterId: version.chapterId,
          content: chapter.content || '',
          charCount: currentCharCount,
          label: '복원 전 자동 저장',
          createdAt: now(),
        })
        .run()
    }

    const ts = now()
    db.update(schema.chapters)
      .set({ content: version.content, updatedAt: ts })
      .where(eq(schema.chapters.id, version.chapterId))
      .run()

    return { success: true, chapterId: version.chapterId }
  })

  safeHandle(IPC.VERSIONS_DELETE, async (_e, versionId: string) => {
    db.delete(schema.versions)
      .where(eq(schema.versions.id, versionId))
      .run()
    return { success: true }
  })
}
