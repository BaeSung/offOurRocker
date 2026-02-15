import { ipcMain } from 'electron'
import { randomUUID as uuid } from 'crypto'
import { eq, and, asc, sql } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerWorksHandlers(): void {
  const db = getDb()

  // Get all works grouped by series
  ipcMain.handle(IPC.WORKS_GET_ALL, async () => {
    const allSeries = db.select().from(schema.series).orderBy(asc(schema.series.title)).all()
    const allWorks = db
      .select()
      .from(schema.works)
      .where(eq(schema.works.deleted, 0))
      .orderBy(asc(schema.works.sortOrder))
      .all()
    const allChapters = db
      .select({
        id: schema.chapters.id,
        workId: schema.chapters.workId,
        title: schema.chapters.title,
        sortOrder: schema.chapters.sortOrder,
        createdAt: schema.chapters.createdAt,
        updatedAt: schema.chapters.updatedAt,
        charCount: sql<number>`length(replace(${schema.chapters.content}, ' ', ''))`,
      })
      .from(schema.chapters)
      .orderBy(asc(schema.chapters.sortOrder))
      .all()

    // Build result
    const seriesResult = allSeries.map((s) => {
      const seriesWorks = allWorks
        .filter((w) => w.seriesId === s.id)
        .map((w) => {
          const workChapters = allChapters.filter((c) => c.workId === w.id)
          const charCount = workChapters.reduce((sum, c) => sum + (c.charCount || 0), 0)
          return {
            ...w,
            tags: JSON.parse(w.tags),
            chapters: workChapters,
            charCount,
          }
        })
      return { ...s, works: seriesWorks }
    })

    const standaloneWorks = allWorks
      .filter((w) => !w.seriesId)
      .map((w) => {
        const workChapters = allChapters.filter((c) => c.workId === w.id)
        const charCount = workChapters.reduce((sum, c) => sum + (c.charCount || 0), 0)
        return {
          ...w,
          tags: JSON.parse(w.tags),
          chapters: workChapters,
          charCount,
        }
      })

    return { series: seriesResult, standaloneWorks }
  })

  // Get single work by ID
  ipcMain.handle(IPC.WORKS_GET_BY_ID, async (_e, id: string) => {
    const work = db.select().from(schema.works).where(eq(schema.works.id, id)).get()
    if (!work) return null
    const chapters = db
      .select()
      .from(schema.chapters)
      .where(eq(schema.chapters.workId, id))
      .orderBy(asc(schema.chapters.sortOrder))
      .all()
    return { ...work, tags: JSON.parse(work.tags), chapters }
  })

  // Create work
  ipcMain.handle(
    IPC.WORKS_CREATE,
    async (
      _e,
      data: {
        title: string
        type: 'novel' | 'short'
        genre: string
        seriesId?: string
        goalChars?: number
        deadline?: string
        tags?: string[]
        firstChapterTitle?: string
      }
    ) => {
      const now = new Date().toISOString()
      const workId = uuid()

      // Determine sort order
      const maxSort = db
        .select({ max: sql<number>`coalesce(max(${schema.works.sortOrder}), -1)` })
        .from(schema.works)
        .get()

      db.insert(schema.works)
        .values({
          id: workId,
          seriesId: data.seriesId || null,
          title: data.title,
          type: data.type,
          genre: data.genre as any,
          status: 'writing',
          goalChars: data.goalChars || null,
          deadline: data.deadline || null,
          tags: JSON.stringify(data.tags || []),
          sortOrder: (maxSort?.max ?? -1) + 1,
          deleted: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      // For novels, auto-create first chapter
      if (data.type === 'novel') {
        const chapterId = uuid()
        db.insert(schema.chapters)
          .values({
            id: chapterId,
            workId,
            title: data.firstChapterTitle || '1장: 제목 없음',
            content: '',
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
          })
          .run()
      }
      // For short stories, create a single "body" chapter to hold content
      if (data.type === 'short') {
        const chapterId = uuid()
        db.insert(schema.chapters)
          .values({
            id: chapterId,
            workId,
            title: '__body__',
            content: '',
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
          })
          .run()
      }

      return { id: workId }
    }
  )

  // Update work metadata
  ipcMain.handle(
    IPC.WORKS_UPDATE,
    async (_e, id: string, data: Partial<{ title: string; genre: string; status: string; seriesId: string | null; goalChars: number; deadline: string; tags: string[] }>) => {
      const updateData: Record<string, any> = { updatedAt: new Date().toISOString() }
      if (data.title !== undefined) updateData.title = data.title
      if (data.genre !== undefined) updateData.genre = data.genre
      if (data.status !== undefined) updateData.status = data.status
      if (data.seriesId !== undefined) updateData.seriesId = data.seriesId
      if (data.goalChars !== undefined) updateData.goalChars = data.goalChars
      if (data.deadline !== undefined) updateData.deadline = data.deadline
      if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags)

      db.update(schema.works).set(updateData).where(eq(schema.works.id, id)).run()
      return { success: true }
    }
  )

  // Soft delete
  ipcMain.handle(IPC.WORKS_DELETE, async (_e, id: string) => {
    const now = new Date().toISOString()
    db.update(schema.works)
      .set({ deleted: 1, deletedAt: now, updatedAt: now })
      .where(eq(schema.works.id, id))
      .run()
    return { success: true }
  })

  // Duplicate work (with chapters)
  ipcMain.handle(IPC.WORKS_DUPLICATE, async (_e, id: string) => {
    const work = db.select().from(schema.works).where(eq(schema.works.id, id)).get()
    if (!work) return { success: false }

    const now = new Date().toISOString()
    const newWorkId = uuid()
    const maxSort = db
      .select({ max: sql<number>`coalesce(max(${schema.works.sortOrder}), -1)` })
      .from(schema.works)
      .get()

    db.insert(schema.works)
      .values({
        ...work,
        id: newWorkId,
        title: `${work.title} (복사본)`,
        sortOrder: (maxSort?.max ?? -1) + 1,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    const chapters = db
      .select()
      .from(schema.chapters)
      .where(eq(schema.chapters.workId, id))
      .orderBy(asc(schema.chapters.sortOrder))
      .all()

    for (const ch of chapters) {
      db.insert(schema.chapters)
        .values({
          ...ch,
          id: uuid(),
          workId: newWorkId,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    return { success: true, id: newWorkId }
  })

  // Get content for short story (single body chapter)
  ipcMain.handle(IPC.WORKS_GET_CONTENT, async (_e, workId: string) => {
    const chapter = db
      .select()
      .from(schema.chapters)
      .where(and(eq(schema.chapters.workId, workId), eq(schema.chapters.title, '__body__')))
      .get()
    return chapter?.content ?? ''
  })

  // Save content for short story
  ipcMain.handle(IPC.WORKS_SAVE_CONTENT, async (_e, workId: string, content: string) => {
    const now = new Date().toISOString()

    // Get old content to compute diff for writing log
    const old = db
      .select({ content: schema.chapters.content })
      .from(schema.chapters)
      .where(and(eq(schema.chapters.workId, workId), eq(schema.chapters.title, '__body__')))
      .get()

    db.update(schema.chapters)
      .set({ content, updatedAt: now })
      .where(and(eq(schema.chapters.workId, workId), eq(schema.chapters.title, '__body__')))
      .run()
    db.update(schema.works).set({ updatedAt: now }).where(eq(schema.works.id, workId)).run()

    // Record writing log
    const newCount = content.replace(/\s/g, '').length
    const oldCount = ((old?.content) || '').replace(/\s/g, '').length
    const diff = newCount - oldCount
    if (diff > 0) {
      const today = now.slice(0, 10)
      db.insert(schema.writingLog)
        .values({
          id: uuid(),
          date: today,
          workId,
          charCount: diff,
        })
        .run()
    }

    return { success: true }
  })
}
