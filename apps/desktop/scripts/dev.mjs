import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'vite'
import electronPath from 'electron'

const server = await createServer({ configFile: 'vite.config.ts' })
await server.listen()

const address = server.httpServer.address()
if (!address || typeof address === 'string') {
  console.error('Failed to start Vite dev server')
  process.exit(1)
}

const url = `http://localhost:${address.port}`

try {
  execFileSync('npx', ['tsc', '-p', 'tsconfig.main.json'], { stdio: 'inherit' })
} catch {
  await server.close()
  process.exit(1)
}

const electron = spawn(String(electronPath), ['dist/main/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: url },
})

electron.on('close', () => {
  server.close()
  process.exit()
})

process.on('SIGINT', () => {
  electron.kill()
  server.close()
  process.exit()
})
