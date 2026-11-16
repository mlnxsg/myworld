// 复盘框。两种用法：
// - mode="archive"：归档项目时弹出，可以填也可以跳过
// - mode="edit"：在归档区里补写或修改复盘

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { archiveProject, saveRetro } from '@/db'
import type { Project } from '@/types'
import { HunchQuote } from './HunchSection'

interface Props {
  project: Project | null // null 表示弹窗关闭
  mode: 'archive' | 'edit'
  onClose: () => void // 关掉弹窗（不管有没有保存）
  onArchived?: () => void // 归档成功后额外要做的事，比如关掉详情面板
}

export default function RetroDialog({ project, mode, onClose, onArchived }: Props) {
  return (
    <Dialog open={project !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="text-ink sm:max-w-md">
        {project && (
          <RetroForm project={project} mode={mode} onClose={onClose} onArchived={onArchived} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RetroForm({
  project,
  mode,
  onClose,
  onArchived,
}: {
  project: Project
  mode: 'archive' | 'edit'
  onClose: () => void
  onArchived?: () => void
}) {
  // 如果以前写过复盘，先把旧内容填进去
  const [learned, setLearned] = useState(project.retro?.learned ?? '')
  const [nextTime, setNextTime] = useState(project.retro?.nextTime ?? '')

  const retro = { learned: learned.trim(), nextTime: nextTime.trim() }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'archive') {
      await archiveProject(project.id, retro)
      onArchived?.()
    } else {
      await saveRetro(project.id, retro)
    }
    onClose()
  }

  // 跳过：只归档，不动复盘内容
  async function handleSkip() {
    await archiveProject(project.id)
    onArchived?.()
    onClose()
  }

  return (
    <form onSubmit={handleSave} className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="font-heading text-lg">
          {mode === 'archive' ? `归档「${project.name}」` : `复盘「${project.name}」`}
        </DialogTitle>
        <DialogDescription>
          {mode === 'archive'
            ? '花一分钟回头看看。也可以先跳过，之后在归档区补写。'
            : '随时可以回来修改。'}
        </DialogDescription>
      </DialogHeader>

      {/* 把当初的直觉原样摆出来，对照实际结果 */}
      {project.hunch && <HunchQuote hunch={project.hunch} />}

      <div className="grid gap-1.5">
        <Label htmlFor="retro-learned">这次学到了什么？</Label>
        <Textarea
          id="retro-learned"
          rows={3}
          value={learned}
          onChange={(e) => setLearned(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="retro-next">下次会怎么做？</Label>
        <Textarea
          id="retro-next"
          rows={3}
          value={nextTime}
          onChange={(e) => setNextTime(e.target.value)}
        />
      </div>

      <DialogFooter>
        {mode === 'archive' ? (
          <>
            <Button type="button" variant="ghost" onClick={handleSkip}>
              跳过，直接归档
            </Button>
            <Button type="submit">保存并归档</Button>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">保存</Button>
          </>
        )}
      </DialogFooter>
    </form>
  )
}
