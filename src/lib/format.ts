// 把时间戳（毫秒数）变成给人看的文字。

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// 例：2026-11-16
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: 'UTC' })

// YYYY-MM-DD 表示日历日期，固定按 UTC 读取，避免时区偏移到前一天。
export function formatWeekday(date: string): string {
  const day = new Date(date)
  return Number.isNaN(day.getTime()) ? '' : weekdayFormatter.format(day)
}

// 例：16:05
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 例：2026-11-16 16:05
export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${formatDate(timestamp)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
