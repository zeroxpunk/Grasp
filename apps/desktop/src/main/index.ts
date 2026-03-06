import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerAiAuthIpc } from './ai-auth/ipc'
import { AiAuthService } from './ai-auth/service'
import { registerAiIpc } from './ai/ipc'

function createWindow() {
  const win = new BrowserWindow({
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
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  }
}

app.whenReady().then(() => {
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
