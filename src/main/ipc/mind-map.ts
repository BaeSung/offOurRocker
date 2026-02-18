import { randomUUID as uuid } from 'crypto'
import { dialog } from 'electron'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { eq } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { now, safeHandle } from './utils'

export function registerMindMapHandlers(): void {
  const db = getDb()

  safeHandle(IPC.MIND_MAP_GET, (_e, workId: string) => {
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

  safeHandle(IPC.MIND_MAP_SAVE, (_e, workId: string, data: string) => {
    const ts = now()
    const existing = db
      .select({ id: schema.mindMaps.id })
      .from(schema.mindMaps)
      .where(eq(schema.mindMaps.workId, workId))
      .get()

    if (existing) {
      db.update(schema.mindMaps)
        .set({ data, updatedAt: ts })
        .where(eq(schema.mindMaps.workId, workId))
        .run()
    } else {
      const id = uuid()
      db.insert(schema.mindMaps)
        .values({ id, workId, data, createdAt: ts, updatedAt: ts })
        .run()
    }

    return { success: true }
  })

  safeHandle(IPC.MIND_MAP_EXPORT_PNG, async (_e, base64Data: string) => {
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

  safeHandle(IPC.MIND_MAP_EXPORT_JSON, async (_e, jsonString: string) => {
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

  safeHandle(IPC.MIND_MAP_IMPORT_JSON, async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' }
    }

    const content = await readFile(result.filePaths[0], 'utf-8')
    const parsed = JSON.parse(content)
    if (!parsed.nodes || !parsed.edges) {
      return { success: false, error: 'Invalid mind map JSON format' }
    }
    return { success: true, data: parsed }
  })
}
