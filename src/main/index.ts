import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './db/connection'
import { registerAllIpcHandlers } from './ipc'
import { runAutoBackupIfNeeded } from './utils/auto-backup'

// Disable the Chromium SUID sandbox when it is not available (e.g. in
// containerised / CI environments where the chrome-sandbox binary cannot be
// owned by root with mode 4755).
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    icon: join(__dirname, '../../resources/icon.png'),
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Initialize DB and IPC before creating the window
  initDatabase()
  registerAllIpcHandlers()

  createWindow()

  // Run auto backup check after startup
  runAutoBackupIfNeeded()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
