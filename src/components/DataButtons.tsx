// 顶部右侧的"导出 / 导入"两个按钮。

import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { exportAll, importAll, markBackedUp, parseBackup } from '@/db'
import { formatDate } from '@/lib/format'
import type { BackupFile } from '@/types'

export default function DataButtons() {
  // 藏起来的"选择文件"输入框。点"导入"按钮时，用代码去点它。
  const fileInput = useRef<HTMLInputElement>(null)
  // 已经读进来、等待确认的备份；null 表示没有
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [error, setError] = useState('')

  // 导出：把全部数据变成一个 JSON 文件，让浏览器下载
  async function handleExport() {
    const backup = await exportAll()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `myworld-${formatDate(Date.now())}.json`
    link.click()

    URL.revokeObjectURL(url)
    markBackedUp() // 状态栏的"上次备份"会跟着更新
  }

  // 选好文件后：读内容、检查格式，没问题就等用户确认
  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // 清掉，这样下次选同一个文件也会触发
    if (!file) return

    const backup = parseBackup(await file.text())
    if (backup) {
      setPending(backup)
    } else {
      setError('这个文件不是"我的世界"导出的备份，没有导入任何内容。')
    }
  }

  async function handleConfirmImport() {
    if (!pending) return
    await importAll(pending)
    setPending(null)
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" variant="ghost" onClick={handleExport}>
        导出
      </Button>
      <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
        导入
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChosen}
      />

      {/* 导入前的确认 */}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>导入会覆盖现有的全部数据</AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                `这份备份导出于 ${formatDate(pending.exportedAt)}，包含 ${pending.projects.length} 个项目、${pending.tasks.length} 条待办、${pending.notes.length} 条碎碎念。`}
              现在白板和归档区里的内容会被全部替换，无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmImport}>
              覆盖并导入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 文件格式不对时的提示 */}
      <AlertDialog open={error !== ''} onOpenChange={(open) => !open && setError('')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>无法导入</AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>知道了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
