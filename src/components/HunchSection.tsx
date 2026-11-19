// 项目详情里的「目标与提醒」：可以追加，写入后不可修改或删除。

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addHunch } from '@/db'
import { formatDateTime } from '@/lib/format'
import type { Hunch, Project } from '@/types'

// 已写下的目标和提醒按时间从早到晚排列。复盘框和归档区也用它。
// 一条都没有时什么也不显示。
export function HunchList({ hunches, showTitle = false }: { hunches?: Hunch[]; showTitle?: boolean }) {
  if (!hunches || hunches.length === 0) return null

  return (
    <>
      {showTitle && <p className="font-heading text-sm font-semibold">目标与提醒</p>}
      <ul className="grid gap-3">
        {hunches.map((hunch) => (
          <li key={hunch.createdAt} className="border-l-2 border-gold pl-3">
            <p className="font-heading text-sm whitespace-pre-wrap">{hunch.content}</p>
            <time className="mt-1 block text-xs text-ink/40 tabular-nums">
              {formatDateTime(hunch.createdAt)}
            </time>
          </li>
        ))}
      </ul>
    </>
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

      <HunchList hunches={project.hunches} />

      {!readOnly && (
        <form onSubmit={handleSubmit} className="grid gap-2">
          <Textarea
            rows={2}
            aria-label="目标与提醒"
            placeholder={hasHunches ? '追加一条' : '写下目标或提醒'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink/40">写入后不可修改</span>
            <Button type="submit" size="sm" variant="outline" disabled={content.trim() === ''}>
              写入
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
