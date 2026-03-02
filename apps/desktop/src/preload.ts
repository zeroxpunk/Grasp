import { contextBridge } from 'electron'

const platform = process.platform

contextBridge.exposeInMainWorld('electronAPI', {
  platform,
})
