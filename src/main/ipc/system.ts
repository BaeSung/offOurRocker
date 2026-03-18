import { dialog, app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { IPC } from '../../shared/ipc-channels'
import { createBackup } from '../utils/backup'
import { safeHandle } from './utils'

export function registerSystemHandlers(): void {
  safeHandle(IPC.SYSTEM_GET_DEFAULT_PATHS, () => {
    const userData = app.getPath('userData')
    const documents = app.getPath('documents')
    return {
      backup: join(userData, 'backups'),
      save: join(documents, 'OffOurRocker'),
      export: join(documents, 'OffOurRocker'),
    }
  })

  safeHandle(IPC.SYSTEM_SELECT_DIRECTORY, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  safeHandle(IPC.SYSTEM_GET_APP_VERSION, async () => {
    return app.getVersion()
  })

  safeHandle(IPC.SYSTEM_PRINT, async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return { success: false, error: 'No window' }
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      win.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        if (success) {
          resolve({ success: true })
        } else {
          resolve({ success: false, error: failureReason })
        }
      })
    })
  })

  safeHandle(IPC.SYSTEM_OPEN_EXTERNAL, async (_e, url: string) => {
    // Only allow https URLs for safety
    if (!url.startsWith('https://')) return { success: false, error: 'Only HTTPS URLs allowed' }
    await shell.openExternal(url)
    return { success: true }
  })

  safeHandle(IPC.BACKUP_NOW, async (_e, customDir?: string) => {
    return createBackup(customDir || undefined)
  })
}
