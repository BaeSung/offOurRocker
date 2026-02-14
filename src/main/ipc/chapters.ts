import { ipcMain } from 'electron'
import { randomUUID as uuid } from 'crypto'
import { eq, asc, sql } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerChaptersHandlers(): void {
  const db = getDb()

  // Get chapter by ID (with content)
  ipcMain.handle(IPC.CHAPTERS_GET_BY_ID, async (_e, id: string) => {
    const chapter = db.select().from(schema.chapters).where(eq(schema.chapters.id, id)).get()
    if (!chapter) return null
    return chapter
  })

  // Create chapter
  ipcMain.handle(
    IPC.CHAPTERS_CREATE,
    async (_e, data: { workId: string; title: string }) => {
      const now = new Date().toISOString()
      const chapterId = uuid()

      const maxSort = db
        .select({ max: sql<number>`coalesce(max(${schema.chapters.sortOrder}), -1)` })
        .from(schema.chapters)
        .where(eq(schema.chapters.workId, data.workId))
        .get()

      db.insert(schema.chapters)
        .values({
          id: chapterId,
          workId: data.workId,
          title: data.title,
          content: '',
          sortOrder: (maxSort?.max ?? -1) + 1,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      // Update work's updatedAt
      db.update(schema.works)
        .set({ updatedAt: now })
        .where(eq(schema.works.id, data.workId))
        .run()

      return { id: chapterId }
    }
  )

  // Save chapter content
  ipcMain.handle(IPC.CHAPTERS_SAVE, async (_e, id: string, content: string) => {
    const now = new Date().toISOString()

    // Get the old content to compute diff for writing log
    const old = db.select({ content: schema.chapters.content, workId: schema.chapters.workId })
      .from(schema.chapters)
      .where(eq(schema.chapters.id, id))
      .get()

    db.update(schema.chapters)
      .set({ content, updatedAt: now })
      .where(eq(schema.chapters.id, id))
      .run()

    if (old) {
      db.update(schema.works)
        .set({ updatedAt: now })
        .where(eq(schema.works.id, old.workId))
        .run()

      // Record writing log
      const newCount = content.replace(/\s/g, '').length
      const oldCount = (old.content || '').replace(/\s/g, '').length
      const diff = newCount - oldCount
      if (diff > 0) {
        const today = now.slice(0, 10) // YYYY-MM-DD
        db.insert(schema.writingLog)
          .values({
            id: uuid(),
            date: today,
            workId: old.workId,
            charCount: diff,
          })
          .run()
      }
    }

    return { success: true }
  })

  // Delete chapter
  ipcMain.handle(IPC.CHAPTERS_DELETE, async (_e, id: string) => {
    const chapter = db.select({ workId: schema.chapters.workId })
      .from(schema.chapters)
      .where(eq(schema.chapters.id, id))
      .get()

    db.delete(schema.chapters).where(eq(schema.chapters.id, id)).run()

    if (chapter) {
      db.update(schema.works)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(schema.works.id, chapter.workId))
        .run()
    }

    return { success: true }
  })

  // Update chapter metadata (title)
  ipcMain.handle(
    IPC.CHAPTERS_UPDATE,
    async (_e, id: string, data: Partial<{ title: string }>) => {
      const now = new Date().toISOString()
      const updateData: Record<string, any> = { updatedAt: now }
      if (data.title !== undefined) updateData.title = data.title
      db.update(schema.chapters).set(updateData).where(eq(schema.chapters.id, id)).run()
      return { success: true }
    }
  )

  // Reorder chapters
  ipcMain.handle(
    IPC.CHAPTERS_REORDER,
    async (_e, orderedIds: string[]) => {
      const now = new Date().toISOString()
      for (let i = 0; i < orderedIds.length; i++) {
        db.update(schema.chapters)
          .set({ sortOrder: i, updatedAt: now })
          .where(eq(schema.chapters.id, orderedIds[i]))
          .run()
      }
      return { success: true }
    }
  )
}
