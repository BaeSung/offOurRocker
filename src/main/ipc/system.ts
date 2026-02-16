import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { createBackup } from '../utils/backup'

export function registerSystemHandlers(): void {
  ipcMain.handle(IPC.SYSTEM_SELECT_DIRECTORY, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.SYSTEM_GET_APP_VERSION, async () => {
    return app.getVersion()
  })

  ipcMain.handle(IPC.SYSTEM_PRINT, async (e) => {
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

  ipcMain.handle(IPC.BACKUP_NOW, async (_e, customDir?: string) => {
    return createBackup(customDir || undefined)
  })
}
