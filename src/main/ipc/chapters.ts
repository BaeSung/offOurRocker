import { randomUUID as uuid } from 'crypto'
import { eq } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { now, charCountNoSpaces, getNextSortOrder, reorderByIds, safeHandle } from './utils'

export function registerChaptersHandlers(): void {
  const db = getDb()

  // Get chapter by ID (with content)
  safeHandle(IPC.CHAPTERS_GET_BY_ID, async (_e, id: string) => {
    return db.select().from(schema.chapters).where(eq(schema.chapters.id, id)).get() ?? null
  })

  // Create chapter
  safeHandle(
    IPC.CHAPTERS_CREATE,
    async (_e, data: { workId: string; title: string }) => {
      const ts = now()
      const chapterId = uuid()
      const sortOrder = getNextSortOrder(
        schema.chapters.sortOrder,
        schema.chapters,
        schema.chapters.workId,
        data.workId
      )

      db.insert(schema.chapters)
        .values({
          id: chapterId,
          workId: data.workId,
          title: data.title,
          content: '',
          sortOrder,
          createdAt: ts,
          updatedAt: ts,
        })
        .run()

      db.update(schema.works)
        .set({ updatedAt: ts })
        .where(eq(schema.works.id, data.workId))
        .run()

      return { id: chapterId }
    }
  )

  // Save chapter content
  safeHandle(IPC.CHAPTERS_SAVE, async (_e, id: string, content: string) => {
    const ts = now()

    const old = db.select({ content: schema.chapters.content, workId: schema.chapters.workId })
      .from(schema.chapters)
      .where(eq(schema.chapters.id, id))
      .get()

    db.update(schema.chapters)
      .set({ content, updatedAt: ts })
      .where(eq(schema.chapters.id, id))
      .run()

    if (old) {
      db.update(schema.works)
        .set({ updatedAt: ts })
        .where(eq(schema.works.id, old.workId))
        .run()

      const newCount = charCountNoSpaces(content)
      const oldCount = charCountNoSpaces(old.content || '')
      const diff = newCount - oldCount
      if (diff > 0) {
        db.insert(schema.writingLog)
          .values({
            id: uuid(),
            date: ts.slice(0, 10),
            workId: old.workId,
            charCount: diff,
          })
          .run()
      }
    }

    return { success: true }
  })

  // Delete chapter
  safeHandle(IPC.CHAPTERS_DELETE, async (_e, id: string) => {
    const chapter = db.select({ workId: schema.chapters.workId })
      .from(schema.chapters)
      .where(eq(schema.chapters.id, id))
      .get()

    db.delete(schema.chapters).where(eq(schema.chapters.id, id)).run()

    if (chapter) {
      db.update(schema.works)
        .set({ updatedAt: now() })
        .where(eq(schema.works.id, chapter.workId))
        .run()
    }

    return { success: true }
  })

  // Update chapter metadata (title)
  safeHandle(
    IPC.CHAPTERS_UPDATE,
    async (_e, id: string, data: { title?: string }) => {
      const updateData: { updatedAt: string; title?: string } = { updatedAt: now() }
      if (data.title !== undefined) updateData.title = data.title
      db.update(schema.chapters).set(updateData).where(eq(schema.chapters.id, id)).run()
      return { success: true }
    }
  )

  // Reorder chapters
  safeHandle(
    IPC.CHAPTERS_REORDER,
    async (_e, orderedIds: string[]) => {
      reorderByIds(schema.chapters, schema.chapters.id, schema.chapters.sortOrder, orderedIds)
      return { success: true }
    }
  )
}
