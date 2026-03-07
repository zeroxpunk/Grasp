import { ipcMain } from 'electron'
import type { DesktopAuthService } from './service'

export function registerAuthIpc(authService: DesktopAuthService): void {
  ipcMain.handle('auth:start-login', () => {
    authService.startGoogleLogin()
  })

  ipcMain.handle('auth:login-dev', async () => {
    return authService.loginDev()
  })

  ipcMain.handle('auth:logout', async () => {
    await authService.logout()
  })

  ipcMain.handle('auth:get-user', () => {
    return authService.getUser()
  })

  ipcMain.handle('auth:is-authenticated', () => {
    return authService.isAuthenticated()
  })

  ipcMain.handle('auth:get-token', async () => {
    return authService.getAccessToken()
  })
}
