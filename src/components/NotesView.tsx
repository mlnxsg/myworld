// 碎碎念区：把所有碎碎念汇总在一起，按时间倒序，按天分组。
// - 顶部可以直接记一条"随手记"：不属于任何项目的想法。
// - 项目里的碎碎念在这里只看不改，点项目名可以打开那个项目的详情。
// - 随手记没有别的地方可以管理，所以在这里可以删除。

import { X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addNote, deleteNote, useAllNotes, useAllProjects } from '@/db'
import { formatDate, formatTime } from '@/lib/format'
import type { Note } from '@/types'

interface Props {
  onOpenProject: (projectId: string) => void
}

export default function NotesView({ onOpenProject }: Props) {
  const notes = useAllNotes()
  const projects = useAllProjects()

  // 把连续的、同一天的碎碎念放进同一组。notes 已经按时间倒序排好，
  // 所以只需要看"这一条和上一组是不是同一天"。
  const days: { date: string; notes: Note[] }[] = []
  for (const note of notes) {
    const date = formatDate(note.createdAt)
    const lastDay = days[days.length - 1]
    if (lastDay && lastDay.date === date) {
      lastDay.notes.push(note)
    } else {
      days.push({ date, notes: [note] })
    }
  }

  return (
    <div className="h-full overflow-auto bg-paper">
      <div className="mx-auto grid max-w-2xl gap-6 px-5 py-8">
        <h2 className="font-heading text-2xl font-bold">碎碎念</h2>

        <QuickNoteForm />

        {notes.length === 0 && (
          <p className="font-heading text-ink/40">
            暂无碎碎念
          </p>
        )}

        {days.map((day) => (
          <section key={day.date}>
            <h3 className="mb-2 border-b border-ink/10 pb-1 text-xs text-ink/50 tabular-nums">
              {day.date}
            </h3>
            <ul className="grid gap-3">
              {day.notes.map((note) => {
                const project = projects.find((p) => p.id === note.projectId)
                return (
                  <li key={note.id} className="group flex gap-3">
                    <time className="w-10 shrink-0 pt-0.5 text-xs text-ink/40 tabular-nums">
                      {formatTime(note.createdAt)}
                    </time>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      {project ? (
                        <button
                          type="button"
                          onClick={() => onOpenProject(project.id)}
                          className="mt-1 text-xs text-gold hover:underline"
                        >
                          {project.name}
                          {project.status === 'archived' && '（已归档）'}
                        </button>
                      ) : (
                        <span className="mt-1 block text-xs text-ink/40">随手记</span>
                      )}
                    </div>
                    {/* 只有随手记能在这里删除；项目里的碎碎念去项目详情里删 */}
                    {note.projectId === null && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="opacity-30 transition-opacity group-hover:opacity-100"
                        onClick={() => deleteNote(note.id)}
                        aria-label="删除这条随手记"
                      >
                        <X />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

// 顶部的"随手记"输入框
function QuickNoteForm() {
  const [content, setContent] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (content.trim() === '') return
    await addNote(null, content.trim()) // null = 不属于任何项目
    setContent('')
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <Textarea
        rows={2}
        placeholder="随手记"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="bg-white"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={content.trim() === ''}>
          添加
        </Button>
      </div>
    </form>
  )
}
