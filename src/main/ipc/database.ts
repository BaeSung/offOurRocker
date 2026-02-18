import { dialog, app, BrowserWindow } from 'electron'
import { join } from 'path'
import { copyFileSync, existsSync } from 'fs'
import { IPC } from '../../shared/ipc-channels'
import { closeDatabase } from '../db/connection'
import { safeHandle } from './utils'

const DB_NAME = 'off-our-rocker.db'

function getDbPath(): string {
  return join(app.getPath('userData'), DB_NAME)
}

export function registerDatabaseHandlers(): void {
  safeHandle(IPC.DB_EXPORT, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const { canceled, filePath } = await dialog.showSaveDialog(win!, {
      title: '데이터 내보내기',
      defaultPath: `off-our-rocker-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    if (canceled || !filePath) return { success: false, canceled: true }

    const dbPath = getDbPath()
    copyFileSync(dbPath, filePath)
    return { success: true, path: filePath }
  })

  safeHandle(IPC.DB_IMPORT, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
      title: '데이터 가져오기',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (canceled || filePaths.length === 0) return { success: false, canceled: true }

    const sourcePath = filePaths[0]
    if (!existsSync(sourcePath)) {
      return { success: false, error: '파일을 찾을 수 없습니다.' }
    }

    const dbPath = getDbPath()
    closeDatabase()
    copyFileSync(sourcePath, dbPath)

    app.relaunch()
    app.exit(0)

    return { success: true }
  })
}
