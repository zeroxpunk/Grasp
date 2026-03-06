import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { delimiter } from 'node:path'

const UNIX_EXTRA_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/opt/local/bin',
  `${homedir()}/.local/bin`,
]

function getExtendedPath() {
  const basePath = process.env.PATH || ''

  if (process.platform === 'win32') {
    return basePath
  }

  const parts = basePath.split(delimiter).filter(Boolean)
  for (const extraPath of UNIX_EXTRA_PATHS) {
    if (!parts.includes(extraPath)) {
      parts.push(extraPath)
    }
  }

  return parts.join(delimiter)
}

export function getCommandEnv() {
  return {
    ...process.env,
    PATH: getExtendedPath(),
  }
}

export function runCommand(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve, reject) => {
    const child = spawn(command, args, {
      env: getCommandEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })

    child.once('error', (error) => {
      reject(error)
    })

    child.once('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode })
    })
  })
}

export async function isCommandAvailable(command: string) {
  try {
    const lookupCommand = process.platform === 'win32' ? 'where' : 'which'
    const result = await runCommand(lookupCommand, [command])
    return result.exitCode === 0
  } catch {
    return false
  }
}
