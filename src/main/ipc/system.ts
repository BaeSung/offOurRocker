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

  ipcMain.handle(IPC.BACKUP_NOW, async (_e, customDir?: string) => {
    return createBackup(customDir || undefined)
  })
}
