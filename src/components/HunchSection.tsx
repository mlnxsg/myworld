import { Pencil, X } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addHunch, deleteHunch, updateHunch } from '@/db'
import { formatDateTime } from '@/lib/format'
import type { Hunch, Project } from '@/types'

// 已写下的目标和提醒按时间从早到晚排列。复盘框和归档区也用它。
// 一条都没有时什么也不显示。
export function HunchList({
  hunches,
  showTitle = false,
  editableProjectId,
}: {
  hunches?: Hunch[]
  showTitle?: boolean
  editableProjectId?: string
}) {
  if (!hunches || hunches.length === 0) return null

  return (
    <>
      {showTitle && <p className="font-heading text-sm font-semibold">目标与提醒</p>}
      <ul className="grid gap-3">
        {hunches.map((hunch) => (
          <HunchRow key={hunch.id} hunch={hunch} editableProjectId={editableProjectId} />
        ))}
      </ul>
    </>
  )
}

function HunchRow({ hunch, editableProjectId }: { hunch: Hunch; editableProjectId?: string }) {
  const [draft, setDraft] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const content = draft?.trim()
    if (!editableProjectId || !content) return
    await updateHunch(editableProjectId, hunch.id, content)
    setDraft(null)
  }

  return (
    <li className="border-l-2 border-gold pl-3">
      {editableProjectId && draft !== null ? (
        <form onSubmit={handleSave} className="grid gap-2">
          <Textarea
            autoFocus
            rows={2}
            aria-label="编辑目标或提醒"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-end gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              取消
            </Button>
            <Button type="submit" size="sm" disabled={draft.trim() === ''}>
              保存
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 break-words font-heading text-sm whitespace-pre-wrap">{hunch.content}</p>
          {editableProjectId && (
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="编辑这条目标或提醒"
                onClick={() => setDraft(hunch.content)}
              >
                <Pencil />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="icon-xs" variant="ghost" aria-label="删除这条目标或提醒">
                    <X />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除这条目标或提醒？</AlertDialogTitle>
                    <AlertDialogDescription>删除后无法恢复。</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => deleteHunch(editableProjectId, hunch.id)}
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      )}
      <time className="mt-1 block text-xs text-ink/40 tabular-nums">
        {formatDateTime(hunch.createdAt)}
      </time>
    </li>
  )
}

export default function HunchSection({
  project,
  readOnly,
}: {
  project: Project
  readOnly: boolean
}) {
  const [content, setContent] = useState('')
  const hasHunches = project.hunches !== undefined && project.hunches.length > 0

  // 一条都没写过，而且是只读（已归档）：这一块就不显示了
  if (readOnly && !hasHunches) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (content.trim() === '') return
    await addHunch(project.id, content.trim())
    setContent('')
  }

  return (
    <section className="grid gap-3">
      <h3 className="font-heading text-base font-semibold">目标与提醒</h3>

      <HunchList hunches={project.hunches} editableProjectId={readOnly ? undefined : project.id} />

      {!readOnly && (
        <form onSubmit={handleSubmit} className="grid gap-2">
          <Textarea
            rows={2}
            aria-label="目标与提醒"
            placeholder={hasHunches ? '追加一条' : '写下目标或提醒'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="outline" disabled={content.trim() === ''}>
              写入
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
