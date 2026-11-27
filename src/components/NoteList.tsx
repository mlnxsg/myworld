// 项目详情里的记录。

import { X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addNote, deleteNote } from '@/db'
import { formatDateTime } from '@/lib/format'
import type { Note } from '@/types'
import DeleteConfirmation from './DeleteConfirmation'
import NoteContent from './NoteContent'

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
      <h3 className="mb-2 font-heading text-base font-semibold">记录</h3>

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
        <p className="py-2 text-sm text-ink/40">暂无记录</p>
      ) : (
        <ul className="mt-2">
          {notes.map((note) => (
            <li key={note.id} className="group border-b border-ink/5 py-2">
              <div className="flex items-center justify-between">
                <time className="text-xs text-ink/40 tabular-nums">
                  {formatDateTime(note.createdAt)}
                </time>
                {!readOnly && (
                  <DeleteConfirmation
                    title="删除这条记录？"
                    description={note.content}
                    onConfirm={() => deleteNote(note.id)}
                  >
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="opacity-30 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                      aria-label="删除这条记录"
                    >
                      <X />
                    </Button>
                  </DeleteConfirmation>
                )}
              </div>
              <NoteContent note={note} readOnly={readOnly} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
