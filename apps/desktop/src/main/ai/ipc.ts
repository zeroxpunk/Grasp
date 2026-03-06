import { ipcMain, BrowserWindow } from 'electron'
import { GraspClient } from '@grasp/api-client'
import * as orchestrationService from './orchestration-service'

function getApiClient(): GraspClient {
  // TODO: resolve backend URL and auth token from desktop config
  const baseUrl = process.env.GRASP_API_URL || 'http://localhost:3000'
  return new GraspClient({ baseUrl })
}

function sendProgress(step: string) {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('ai:progress', step)
  }
}

export function registerAiIpc() {
  ipcMain.handle('ai:create-course', async (_event, params: { description: string; context?: string }) => {
    const client = getApiClient()
    return orchestrationService.createCourse(client, params, sendProgress)
  })

  ipcMain.handle('ai:generate-lesson', async (_event, params: { courseSlug: string; lessonNumber: number }) => {
    const client = getApiClient()
    return orchestrationService.generateLesson(client, params, sendProgress)
  })

  ipcMain.handle('ai:regenerate-exercises', async (_event, params: { courseSlug: string; lessonNumber: number }) => {
    const client = getApiClient()
    return orchestrationService.regenerateExercises(client, params)
  })
}
