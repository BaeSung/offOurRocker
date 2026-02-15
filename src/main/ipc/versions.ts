import { ipcMain } from 'electron'
import { randomUUID as uuid } from 'crypto'
import { eq, desc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

const MAX_VERSIONS_PER_CHAPTER = 50

export function registerVersionsHandlers(): void {
  const db = getDb()

  // List versions for a chapter
  ipcMain.handle(IPC.VERSIONS_LIST, async (_e, chapterId: string) => {
    const versions = db
      .select()
      .from(schema.versions)
      .where(eq(schema.versions.chapterId, chapterId))
      .orderBy(desc(schema.versions.createdAt))
      .all()

    return versions
  })

  // Create a version snapshot
  ipcMain.handle(
    IPC.VERSIONS_CREATE,
    async (_e, chapterId: string, label?: string) => {
      // Get current chapter content
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
          createdAt: new Date().toISOString(),
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

  // Restore a version (replaces current chapter content)
  ipcMain.handle(IPC.VERSIONS_RESTORE, async (_e, versionId: string) => {
    const version = db
      .select()
      .from(schema.versions)
      .where(eq(schema.versions.id, versionId))
      .get()

    if (!version) return { success: false, error: 'Version not found' }

    // Save current content as a new version before restoring ("복원 전" snapshot)
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
          createdAt: new Date().toISOString(),
        })
        .run()
    }

    // Restore the version content
    const now = new Date().toISOString()
    db.update(schema.chapters)
      .set({ content: version.content, updatedAt: now })
      .where(eq(schema.chapters.id, version.chapterId))
      .run()

    return { success: true, chapterId: version.chapterId }
  })

  // Delete a version
  ipcMain.handle(IPC.VERSIONS_DELETE, async (_e, versionId: string) => {
    db.delete(schema.versions)
      .where(eq(schema.versions.id, versionId))
      .run()
    return { success: true }
  })
}
