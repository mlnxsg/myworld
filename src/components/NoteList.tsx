// 项目详情里的"说说"部分。

import { X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addNote, deleteNote } from '@/db'
import { formatDateTime } from '@/lib/format'
import type { Note } from '@/types'

interface Props {
  projectId: string
  notes: Note[] // 已经按时间倒序排好
  readOnly: boolean
}

export default function NoteList({ projectId, notes, readOnly }: Props) {
  const [content, setContent] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (content.trim() === '') return
    await addNote(projectId, content.trim())
    setContent('')
  }

  return (
    <section>
      <h3 className="mb-2 font-heading text-base font-semibold">说说</h3>

      {!readOnly && (
        <form onSubmit={handleSubmit} className="grid gap-2">
          <Textarea
            rows={2}
            placeholder="记录想法"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={content.trim() === ''}>
              添加
            </Button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <p className="py-2 text-sm text-ink/40">暂无说说</p>
      ) : (
        <ul className="mt-2">
          {notes.map((note) => (
            <li key={note.id} className="group border-b border-ink/5 py-2">
              <div className="flex items-center justify-between">
                <time className="text-xs text-ink/40 tabular-nums">
                  {formatDateTime(note.createdAt)}
                </time>
                {!readOnly && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="opacity-30 transition-opacity group-hover:opacity-100"
                    onClick={() => deleteNote(note.id)}
                    aria-label="删除这条说说"
                  >
                    <X />
                  </Button>
                )}
              </div>
              {/* whitespace-pre-wrap：保留输入时的换行 */}
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
