import { ipcMain } from 'electron'
import { eq, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerPlotEventsHandlers(): void {
  const db = getDb()

  // Get all events for a work
  ipcMain.handle(IPC.PLOT_EVENTS_GET_BY_WORK, async (_e, workId: string) => {
    return db
      .select()
      .from(schema.plotEvents)
      .where(eq(schema.plotEvents.workId, workId))
      .orderBy(asc(schema.plotEvents.sortOrder))
      .all()
  })

  // Create event
  ipcMain.handle(
    IPC.PLOT_EVENTS_CREATE,
    async (
      _e,
      data: {
        workId: string
        title: string
        description?: string
        color?: string
        chapterId?: string
      }
    ) => {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      // Get max sort order
      const last = db
        .select({ maxOrder: schema.plotEvents.sortOrder })
        .from(schema.plotEvents)
        .where(eq(schema.plotEvents.workId, data.workId))
        .orderBy(asc(schema.plotEvents.sortOrder))
        .all()

      const nextOrder = last.length > 0 ? Math.max(...last.map((r) => r.maxOrder)) + 1 : 0

      db.insert(schema.plotEvents)
        .values({
          id,
          workId: data.workId,
          chapterId: data.chapterId ?? null,
          title: data.title,
          description: data.description ?? null,
          color: data.color ?? '#3b82f6',
          sortOrder: nextOrder,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      return { id }
    }
  )

  // Update event
  ipcMain.handle(
    IPC.PLOT_EVENTS_UPDATE,
    async (
      _e,
      id: string,
      data: Partial<{
        title: string
        description: string
        color: string
        chapterId: string | null
      }>
    ) => {
      const now = new Date().toISOString()
      db.update(schema.plotEvents)
        .set({ ...data, updatedAt: now })
        .where(eq(schema.plotEvents.id, id))
        .run()
      return { success: true }
    }
  )

  // Delete event
  ipcMain.handle(IPC.PLOT_EVENTS_DELETE, async (_e, id: string) => {
    db.delete(schema.plotEvents).where(eq(schema.plotEvents.id, id)).run()
    return { success: true }
  })

  // Reorder events
  ipcMain.handle(IPC.PLOT_EVENTS_REORDER, async (_e, orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      db.update(schema.plotEvents)
        .set({ sortOrder: i })
        .where(eq(schema.plotEvents.id, orderedIds[i]))
        .run()
    }
    return { success: true }
  })
}
