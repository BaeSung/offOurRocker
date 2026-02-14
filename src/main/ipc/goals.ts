import { ipcMain } from 'electron'
import { randomUUID as uuid } from 'crypto'
import { eq } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerGoalsHandlers(): void {
  const db = getDb()

  ipcMain.handle(IPC.GOALS_GET_ALL, async () => {
    return db.select().from(schema.goals).all()
  })

  ipcMain.handle(
    IPC.GOALS_CREATE,
    async (
      _e,
      data: {
        title: string
        description?: string
        targetType: 'daily' | 'total' | 'deadline'
        targetValue: number
        deadline?: string
      }
    ) => {
      const id = uuid()
      db.insert(schema.goals)
        .values({
          id,
          title: data.title,
          description: data.description || null,
          targetType: data.targetType,
          targetValue: data.targetValue,
          currentValue: 0,
          deadline: data.deadline || null,
          createdAt: new Date().toISOString(),
        })
        .run()
      return { id }
    }
  )

  ipcMain.handle(
    IPC.GOALS_UPDATE,
    async (_e, id: string, data: Partial<{ title: string; currentValue: number; targetValue: number }>) => {
      db.update(schema.goals).set(data).where(eq(schema.goals.id, id)).run()
      return { success: true }
    }
  )

  ipcMain.handle(IPC.GOALS_DELETE, async (_e, id: string) => {
    db.delete(schema.goals).where(eq(schema.goals.id, id)).run()
    return { success: true }
  })
}
