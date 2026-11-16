// 项目详情里的"直觉预判"部分：只能写一次，写下后不能修改。

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { setHunch } from '@/db'
import { formatDateTime } from '@/lib/format'
import type { Project } from '@/types'

// 已经写下的预判：一段引用样式的文字。复盘框和归档区也用它。
export function HunchQuote({ hunch }: { hunch: NonNullable<Project['hunch']> }) {
  return (
    <blockquote className="border-l-2 border-gold pl-3">
      <p className="font-heading text-sm whitespace-pre-wrap italic">{hunch.content}</p>
      <footer className="mt-1 text-xs text-ink/40 tabular-nums">
        当初的直觉 · {formatDateTime(hunch.createdAt)}
      </footer>
    </blockquote>
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

  if (project.hunch) {
    return (
      <section>
        <h3 className="mb-2 font-heading text-base font-semibold">直觉预判</h3>
        <HunchQuote hunch={project.hunch} />
      </section>
    )
  }

  // 没写过，而且是只读（已归档）：这一块就不显示了
  if (readOnly) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (content.trim() === '') return
    await setHunch(project.id, content.trim())
  }

  return (
    <section>
      <h3 className="mb-2 font-heading text-base font-semibold">直觉预判</h3>
      <form onSubmit={handleSubmit} className="grid gap-2">
        <Textarea
          rows={2}
          placeholder="我觉得这件事会怎么发展？最大的坑在哪？"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink/40">写下后不能修改</span>
          <Button type="submit" size="sm" variant="outline" disabled={content.trim() === ''}>
            写下
          </Button>
        </div>
      </form>
    </section>
  )
}
