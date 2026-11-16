// 双击白板后弹出的"新建项目"框。

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createProject } from '@/db'

interface Props {
  position: { x: number; y: number } | null // 新项目要放的位置；null 表示弹窗关闭
  onClose: () => void
}

export default function NewProjectDialog({ position, onClose }: Props) {
  return (
    <Dialog open={position !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">新建项目</DialogTitle>
          <DialogDescription>只有名称是必填的，其他可以之后再补。</DialogDescription>
        </DialogHeader>
        {/* 表单单独做成一个组件：弹窗每次打开都会重新创建它，输入框自然就清空了 */}
        {position && <NewProjectForm position={position} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function NewProjectForm({
  position,
  onClose,
}: {
  position: { x: number; y: number }
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [estimate, setEstimate] = useState('')
  const [hunch, setHunch] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim() === '') return

    // 预估总分：留空就是不填；填了就必须是正整数
    let estimatedTotal: number | undefined
    if (estimate.trim() !== '') {
      estimatedTotal = Number(estimate)
      if (!Number.isInteger(estimatedTotal) || estimatedTotal < 1) {
        setError('预估总分要填正整数，或者留空。')
        return
      }
    }

    await createProject({
      name: name.trim(),
      x: position.x,
      y: position.y,
      estimatedTotal,
      hunch: hunch.trim() || undefined,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="project-name">名称</Label>
        <Input
          id="project-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="project-estimate">预估总分（选填）</Label>
        <Input
          id="project-estimate"
          type="number"
          min={1}
          step={1}
          placeholder="整件事大概多少工作量分"
          value={estimate}
          onChange={(e) => {
            setEstimate(e.target.value)
            setError('')
          }}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="project-hunch">直觉预判（选填）</Label>
        <Textarea
          id="project-hunch"
          rows={2}
          placeholder="我觉得这件事会怎么发展？最大的坑在哪？"
          value={hunch}
          onChange={(e) => setHunch(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">写下后不能修改，复盘时会原样给你看。</p>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={name.trim() === ''}>
          新建
        </Button>
      </DialogFooter>
    </form>
  )
}
