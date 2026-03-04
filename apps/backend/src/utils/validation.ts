export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function parsePositiveInteger(raw: string): number | null {
  const value = Number.parseInt(raw, 10)
  return Number.isInteger(value) && value > 0 ? value : null
}

export function requireNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
