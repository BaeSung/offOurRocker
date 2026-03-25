import { dialog, app, BrowserWindow } from 'electron'
import { join } from 'path'
import { copyFileSync, existsSync } from 'fs'
import { IPC } from '../../shared/ipc-channels'
import { closeDatabase, DB_NAME } from '../db/connection'
import { safeHandle, localDateStr } from './utils'

function getDbPath(): string {
  return join(app.getPath('userData'), DB_NAME)
}

export function registerDatabaseHandlers(): void {
  safeHandle(IPC.DB_EXPORT, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, error: 'No active window' }
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: '데이터 내보내기',
      defaultPath: `off-our-rocker-backup-${localDateStr()}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    if (canceled || !filePath) return { success: false, canceled: true }

    try {
      const dbPath = getDbPath()
      copyFileSync(dbPath, filePath)
      return { success: true, path: filePath }
    } catch (err) {
      return { success: false, error: `내보내기 실패: ${err instanceof Error ? err.message : 'Unknown error'}` }
    }
  })

  safeHandle(IPC.DB_IMPORT, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, error: 'No active window' }
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
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
