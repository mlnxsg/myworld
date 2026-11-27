// 顶部右侧的备份菜单。

import { ChevronDown } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
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
      setError('文件格式不符，未导入任何内容。')
    }
  }

  async function handleConfirmImport() {
    if (!pending) return
    await importAll(pending)
    setPending(null)
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button type="button" size="sm" variant="ghost">
            备份
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 grid min-w-28 gap-0.5 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md"
          >
            <DropdownMenu.Item
              className="cursor-pointer rounded-md px-2 py-1.5 outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              onSelect={handleExport}
            >
              导出备份
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="cursor-pointer rounded-md px-2 py-1.5 outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              onSelect={() => fileInput.current?.click()}
            >
              导入备份
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
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
            <AlertDialogTitle>覆盖现有数据？</AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                `备份于 ${formatDate(pending.exportedAt)}：项目 ${pending.projects.length} · 项目待办 ${pending.tasks.length} · 独立待办 ${pending.todos.length} · 记录 ${pending.notes.length} · 经验总结 ${pending.achievements.length} · Ref ${pending.references.length} · 我的日常 ${pending.routines.length}。`}
              现有内容将被全部替换，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmImport}>
              导入
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
            <AlertDialogAction>确定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
