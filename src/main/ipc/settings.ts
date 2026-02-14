import { ipcMain } from 'electron'
import { eq } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { DEFAULT_SETTINGS } from '../../shared/types'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerSettingsHandlers(): void {
  const db = getDb()

  // Get all settings merged with defaults
  ipcMain.handle(IPC.SETTINGS_GET_ALL, async () => {
    const rows = db.select().from(schema.settings).all()
    const stored: Record<string, string> = {}
    for (const row of rows) {
      stored[row.key] = row.value
    }

    // Merge with defaults
    const result: Record<string, any> = { ...DEFAULT_SETTINGS }
    for (const [key, value] of Object.entries(stored)) {
      if (key in DEFAULT_SETTINGS) {
        const defaultVal = (DEFAULT_SETTINGS as any)[key]
        if (typeof defaultVal === 'number') {
          result[key] = Number(value)
        } else if (typeof defaultVal === 'boolean') {
          result[key] = value === 'true'
        } else {
          result[key] = value
        }
      }
    }
    return result
  })

  // Set a single setting
  ipcMain.handle(IPC.SETTINGS_SET, async (_e, key: string, value: any) => {
    const strValue = String(value)
    const existing = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get()
    if (existing) {
      db.update(schema.settings).set({ value: strValue }).where(eq(schema.settings.key, key)).run()
    } else {
      db.insert(schema.settings).values({ key, value: strValue }).run()
    }
    return { success: true }
  })
}
