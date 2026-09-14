/** Preserve the timestamp's offset when parsing, then display client-local time. */
export function formatLocalTimestamp(value: string | null | undefined, precision: 'date' | 'minute' = 'minute'): string {
  if (typeof value !== 'string' || !value.trim()) return '时间未知'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '时间未知'
  const pad = (part: number) => String(part).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return precision === 'date' ? day : `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
