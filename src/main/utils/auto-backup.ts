import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { createBackup } from './backup'

function getSetting(key: string): string | undefined {
  const db = getDb()
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get()
  return row?.value
}

function setSetting(key: string, value: string): void {
  const db = getDb()
  const existing = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get()
  if (existing) {
    db.update(schema.settings).set({ value }).where(eq(schema.settings.key, key)).run()
  } else {
    db.insert(schema.settings).values({ key, value }).run()
  }
}

export async function runAutoBackupIfNeeded(): Promise<void> {
  try {
    const autoBackup = getSetting('autoBackup')
    if (autoBackup !== 'true') return

    const frequency = getSetting('backupFrequency') || 'daily'
    const lastBackup = getSetting('lastAutoBackup')
    const backupDir = getSetting('backupDirectory') || undefined

    const now = Date.now()
    const intervalMs = frequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000

    if (lastBackup) {
      const elapsed = now - Number(lastBackup)
      if (elapsed < intervalMs) return
    }

    const result = await createBackup(backupDir)
    if (result.success) {
      setSetting('lastAutoBackup', String(now))
    }
  } catch {
    // Auto backup failure is non-critical
  }
}
