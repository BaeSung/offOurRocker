import { app } from 'electron'
import { copyFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'
import { getSqlite } from '../db/connection'

const MAX_BACKUPS = 30

function getDefaultBackupDir(): string {
  return join(app.getPath('userData'), 'backups')
}

function getDbPath(): string {
  return join(app.getPath('userData'), 'off-our-rocker.db')
}

export async function createBackup(customDir?: string): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const sqlite = getSqlite()
    if (!sqlite) {
      return { success: false, error: 'Database not initialized' }
    }

    const backupDir = customDir || getDefaultBackupDir()
    await mkdir(backupDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupFileName = `off-our-rocker_${timestamp}.db`
    const backupPath = join(backupDir, backupFileName)

    // Checkpoint WAL before backup
    sqlite.pragma('wal_checkpoint(TRUNCATE)')

    const dbPath = getDbPath()
    await copyFile(dbPath, backupPath)

    await pruneOldBackups(backupDir)

    return { success: true, path: backupPath }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function pruneOldBackups(dir: string): Promise<void> {
  try {
    const files = await readdir(dir)
    const backups = files.filter((f) => f.startsWith('off-our-rocker_') && f.endsWith('.db'))

    if (backups.length <= MAX_BACKUPS) return

    const withStats = await Promise.all(
      backups.map(async (name) => {
        const filePath = join(dir, name)
        const s = await stat(filePath)
        return { name, path: filePath, mtime: s.mtimeMs }
      })
    )

    withStats.sort((a, b) => b.mtime - a.mtime)

    const toDelete = withStats.slice(MAX_BACKUPS)
    for (const f of toDelete) {
      await unlink(f.path)
    }
  } catch {
    // Prune failure is non-critical
  }
}
