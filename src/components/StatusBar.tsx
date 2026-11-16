// 页面底部的状态栏：当前时间、日期、星期。

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/format'

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export default function StatusBar() {
  const [now, setNow] = useState(() => new Date())

  // 每秒更新一次时间。组件消失时要把定时器关掉，否则它会一直空跑。
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <footer className="flex items-center gap-4 border-t px-5 py-1.5 text-xs text-ink/60 tabular-nums">
      <span className="font-medium text-ink">{now.toLocaleTimeString('zh-CN', { hour12: false })}</span>
      <span>{formatDate(now.getTime())}</span>
      <span>{WEEKDAYS[now.getDay()]}</span>
    </footer>
  )
}
