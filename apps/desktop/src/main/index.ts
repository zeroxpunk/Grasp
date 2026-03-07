import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerAiAuthIpc } from './ai-auth/ipc'
import { AiAuthService } from './ai-auth/service'
import { registerAiIpc } from './ai/ipc'
import { DesktopAuthService } from './auth/service'
import { registerAuthIpc } from './auth/ipc'

// Register custom protocol for OAuth callbacks
app.setAsDefaultProtocolClient('grasp')

let mainWindow: BrowserWindow | null = null
let authService: DesktopAuthService

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Grasp',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  }
}

function handleProtocolUrl(url: string) {
  if (url.startsWith('grasp://auth/callback')) {
    authService.handleCallback(url).then((success) => {
      if (success && mainWindow) {
        mainWindow.webContents.send('auth:login-complete')
        mainWindow.focus()
      }
    })
  }
}

// macOS: handle protocol URL via open-url event
app.on('open-url', (_event, url) => {
  handleProtocolUrl(url)
})

// Windows/Linux: handle protocol URL via second-instance
const gotSingleLock = app.requestSingleInstanceLock()
if (!gotSingleLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    // The protocol URL is the last argument on Windows/Linux
    const url = argv.find((arg) => arg.startsWith('grasp://'))
    if (url) handleProtocolUrl(url)

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  authService = new DesktopAuthService()
  registerAuthIpc(authService)

  const aiAuthService = new AiAuthService()
  registerAiAuthIpc(aiAuthService)
  registerAiIpc()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
