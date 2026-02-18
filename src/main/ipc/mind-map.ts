import { ipcMain, dialog } from 'electron'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { eq } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerMindMapHandlers(): void {
  const db = getDb()

  // Get mind map data for a work
  ipcMain.handle(IPC.MIND_MAP_GET, (_e, workId: string) => {
    const row = db
      .select()
      .from(schema.mindMaps)
      .where(eq(schema.mindMaps.workId, workId))
      .get()

    if (!row) {
      return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    }

    try {
      return JSON.parse(row.data)
    } catch {
      return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    }
  })

  // Save (upsert) mind map data
  ipcMain.handle(IPC.MIND_MAP_SAVE, (_e, workId: string, data: string) => {
    const now = new Date().toISOString()
    const existing = db
      .select({ id: schema.mindMaps.id })
      .from(schema.mindMaps)
      .where(eq(schema.mindMaps.workId, workId))
      .get()

    if (existing) {
      db.update(schema.mindMaps)
        .set({ data, updatedAt: now })
        .where(eq(schema.mindMaps.workId, workId))
        .run()
    } else {
      const id = crypto.randomUUID()
      db.insert(schema.mindMaps)
        .values({ id, workId, data, createdAt: now, updatedAt: now })
        .run()
    }

    return { success: true }
  })

  // Export as PNG (receive base64 from renderer, save via dialog)
  ipcMain.handle(IPC.MIND_MAP_EXPORT_PNG, async (_e, base64Data: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: 'mind-map.png',
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' }
    }

    const buffer = Buffer.from(base64Data.replace(/^data:image\/png;base64,/, ''), 'base64')
    await mkdir(dirname(result.filePath), { recursive: true })
    await writeFile(result.filePath, buffer)

    return { success: true, path: result.filePath }
  })

  // Export as JSON
  ipcMain.handle(IPC.MIND_MAP_EXPORT_JSON, async (_e, jsonString: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: 'mind-map.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' }
    }

    await mkdir(dirname(result.filePath), { recursive: true })
    await writeFile(result.filePath, jsonString, 'utf-8')

    return { success: true, path: result.filePath }
  })

  // Import JSON
  ipcMain.handle(IPC.MIND_MAP_IMPORT_JSON, async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' }
    }

    const content = await readFile(result.filePaths[0], 'utf-8')

    try {
      const parsed = JSON.parse(content)
      if (!parsed.nodes || !parsed.edges) {
        return { success: false, error: 'Invalid mind map JSON format' }
      }
      return { success: true, data: parsed }
    } catch {
      return { success: false, error: 'Invalid JSON file' }
    }
  })
}
