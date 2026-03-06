import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

type ClaudeCredentialFile = {
  claudeAiOauth?: {
    accessToken?: string
  }
}

function readClaudeCredentialFile() {
  const filePath = path.join(homedir(), '.claude', '.credentials.json')
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(content) as ClaudeCredentialFile
    return typeof parsed.claudeAiOauth?.accessToken === 'string'
      ? parsed.claudeAiOauth.accessToken
      : null
  } catch {
    return null
  }
}

function readClaudeTokenFromMacKeychain() {
  try {
    const tokenBlob = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()

    if (!tokenBlob) {
      return null
    }

    const parsed = JSON.parse(tokenBlob) as ClaudeCredentialFile
    return typeof parsed.claudeAiOauth?.accessToken === 'string'
      ? parsed.claudeAiOauth.accessToken
      : null
  } catch {
    return null
  }
}

function readClaudeTokenFromLinuxSecretStore() {
  try {
    const tokenBlob = execSync(
      'secret-tool lookup service "Claude Code" account "credentials"',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()

    if (!tokenBlob) {
      return null
    }

    const parsed = JSON.parse(tokenBlob) as ClaudeCredentialFile
    return typeof parsed.claudeAiOauth?.accessToken === 'string'
      ? parsed.claudeAiOauth.accessToken
      : null
  } catch {
    return null
  }
}

function readClaudeTokenFromSystemStore() {
  if (process.platform === 'darwin') {
    return readClaudeTokenFromMacKeychain()
  }

  if (process.platform === 'linux') {
    return readClaudeTokenFromLinuxSecretStore()
  }

  return readClaudeCredentialFile()
}

export function getExistingClaudeToken() {
  return readClaudeTokenFromSystemStore() || readClaudeCredentialFile()
}

export function getClaudeCliConfigStatus() {
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
  const baseUrl = process.env.ANTHROPIC_BASE_URL || null

  return {
    hasConfig: hasApiKey || Boolean(baseUrl),
    hasApiKey,
    baseUrl,
  }
}
