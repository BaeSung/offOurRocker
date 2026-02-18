import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { sql, eq } from 'drizzle-orm'
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { getDb, getSqlite } from '../db/connection'

/** Current ISO timestamp */
export function now(): string {
  return new Date().toISOString()
}

/** Count characters excluding whitespace */
export function charCountNoSpaces(text: string): number {
  return text.replace(/\s/g, '').length
}

/** Get the next sortOrder value for a scoped table (e.g. chapters under a work) */
export function getNextSortOrder(
  sortOrderCol: SQLiteColumn,
  table: SQLiteTable,
  scopeCol?: SQLiteColumn,
  scopeValue?: string
): number {
  const db = getDb()
  const query = db
    .select({ max: sql<number>`coalesce(max(${sortOrderCol}), -1)` })
    .from(table)

  if (scopeCol && scopeValue !== undefined) {
    const row = query.where(eq(scopeCol, scopeValue)).get()
    return (row?.max ?? -1) + 1
  }

  const row = query.get()
  return (row?.max ?? -1) + 1
}

/** Reorder rows by an ordered array of IDs */
export function reorderByIds(
  table: SQLiteTable,
  idCol: SQLiteColumn,
  sortOrderCol: SQLiteColumn,
  orderedIds: string[]
): void {
  const db = getDb()
  const sqlite = getSqlite()
  const run = sqlite.transaction(() => {
    for (let i = 0; i < orderedIds.length; i++) {
      db.update(table)
        .set({ [sortOrderCol.name]: i })
        .where(eq(idCol, orderedIds[i]))
        .run()
    }
  })
  run()
}

/**
 * Safe IPC handler wrapper — wraps handler in try-catch,
 * logging errors and returning { success: false, error } on failure.
 */
export function safeHandle(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => any
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[IPC:${channel}] Error:`, message)
      return { success: false, error: message }
    }
  })
}
