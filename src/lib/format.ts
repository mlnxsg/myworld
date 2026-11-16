// 把时间戳（毫秒数）变成给人看的文字。

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// 例：2026-11-16
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 例：2026-11-16 16:05
export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${formatDate(timestamp)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
