// 页面底部的状态栏：左边是当前时间、日期、星期，右边是备份提醒。

import { useEffect, useState } from 'react'
import { getLastBackupAt } from '@/db'
import { formatDate, formatTime } from '@/lib/format'

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

// 超过这么多天没备份，提醒会变成金色
const REMIND_AFTER_DAYS = 7
const ONE_DAY = 24 * 60 * 60 * 1000 // 一天有多少毫秒

export default function StatusBar() {
  const [now, setNow] = useState(() => new Date())

  // 每秒更新一次时间。组件消失时要把定时器关掉，否则它会一直空跑。
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 状态栏每秒都会重新渲染，所以这里每次都读到最新的备份时间
  const lastBackupAt = getLastBackupAt()
  const daysSince = lastBackupAt === null ? null : Math.floor((now.getTime() - lastBackupAt) / ONE_DAY)

  let backupText: string
  if (daysSince === null) backupText = '还没备份过'
  else if (daysSince === 0) backupText = `上次备份：${formatTime(lastBackupAt!)}`
  else backupText = `上次备份：${daysSince} 天前`

  const needsBackup = daysSince === null || daysSince >= REMIND_AFTER_DAYS

  return (
    <footer className="flex items-center gap-4 border-t px-5 py-1.5 text-xs text-ink/60 tabular-nums">
      <span className="font-medium text-ink">{now.toLocaleTimeString('zh-CN', { hour12: false })}</span>
      <span>{formatDate(now.getTime())}</span>
      <span>{WEEKDAYS[now.getDay()]}</span>

      <span className={`ml-auto ${needsBackup ? 'font-medium text-gold' : ''}`}>
        {backupText}
        {needsBackup && '，点右上角"导出"存一份'}
      </span>
    </footer>
  )
}
