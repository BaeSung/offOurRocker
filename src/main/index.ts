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

// macOS에서 백그라운드 복귀 시 검은 화면이 나타나는 Chromium occlusion 버그 회피
app.commandLine.appendSwitch(
  'disable-features',
  'CalculateNativeWinOcclusion,MacWebContentsOcclusion'
)
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    show: false,
    frame: true,
    backgroundColor: '#0f0f0f',
    icon: join(__dirname, '../../resources/icon.png'),
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 백그라운드 복귀 시 빈 프레임이 남아 있는 경우를 위해 강제 리페인트 트리거
  const forceRepaint = (): void => {
    if (mainWindow.isDestroyed()) return
    const bounds = mainWindow.getBounds()
    mainWindow.setBounds({ ...bounds, width: bounds.width + 1 }, false)
    mainWindow.setBounds(bounds, false)
  }
  mainWindow.on('show', forceRepaint)
  mainWindow.on('focus', forceRepaint)
  mainWindow.on('restore', forceRepaint)

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

let isQuitting = false

app.on('before-quit', (e) => {
  if (isQuitting) {
    closeDatabase()
    return
  }

  e.preventDefault()
  isQuitting = true

  runAutoBackupIfNeeded().finally(() => {
    app.quit()
  })
})
