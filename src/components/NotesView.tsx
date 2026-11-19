// 碎碎念区：把所有碎碎念汇总在一起，按时间倒序，按天分组。
// - 顶部可以直接记一条"随手记"：不属于任何项目的想法。
// - 项目里的碎碎念在这里只看不改，点项目名可以打开那个项目的详情。
// - 随手记没有别的地方可以管理，所以在这里可以删除。

import { X } from 'lucide-react'
import { useRef, useState } from 'react'
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
  const projects = new Map(useAllProjects().map((project) => [project.id, project]))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const contentPane = useRef<HTMLDivElement>(null)

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

  const diaryDays = days
    .map(({ date, notes }) => ({ date, notes: notes.filter((note) => note.projectId === null) }))
    .filter((day) => day.notes.length > 0)
  const selectedDay = diaryDays.find((day) => day.date === selectedDate)
  const visibleDays = selectedDay
    ? [{ ...selectedDay, notes: [...selectedDay.notes].reverse() }]
    : days

  function selectDate(date: string | null) {
    setSelectedDate(date)
    contentPane.current?.scrollTo({ top: 0 })
  }

  async function handleDelete(noteId: string) {
    await deleteNote(noteId)
    if (selectedDay?.notes.length === 1 && selectedDay.notes[0].id === noteId) {
      setSelectedDate((date) => (date === selectedDay.date ? null : date))
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-paper sm:overflow-hidden">
      <div className="mx-auto max-w-5xl sm:grid sm:h-full sm:grid-cols-[10rem_minmax(0,1fr)]">
        <nav
          aria-label="随手记时间线"
          className="border-b border-ink/10 px-5 py-4 sm:min-h-0 sm:overflow-y-auto sm:border-r sm:border-b-0 sm:py-8"
        >
          <h2 className="mb-2 font-heading text-sm font-semibold">随手记时间线</h2>
          <button
            type="button"
            aria-current={selectedDay ? undefined : 'true'}
            onClick={() => selectDate(null)}
            className="rounded-md px-2 py-1 text-sm text-ink/70 hover:bg-folder aria-[current=true]:bg-folder aria-[current=true]:font-semibold aria-[current=true]:text-ink"
          >
            全部碎碎念
          </button>
          {diaryDays.length === 0 ? (
            <p className="mt-3 text-xs text-ink/50">暂无随手记</p>
          ) : (
            <div className="mt-3 max-h-32 overflow-y-auto overscroll-contain sm:max-h-none sm:overflow-visible">
              <ol className="ml-2 border-l border-folder-edge">
                {diaryDays.map(({ date }) => (
                  <li key={date} className="relative pl-3">
                    <span
                      aria-hidden="true"
                      className={`absolute top-1/2 left-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${selectedDay?.date === date ? 'bg-gold' : 'bg-folder-edge'}`}
                    />
                    <button
                      type="button"
                      aria-current={selectedDay?.date === date ? 'date' : undefined}
                      onClick={() => selectDate(date)}
                      className="rounded-md px-2 py-1 text-xs text-ink/70 tabular-nums hover:bg-folder aria-[current=date]:bg-folder aria-[current=date]:font-semibold aria-[current=date]:text-ink"
                    >
                      <time dateTime={date}>{date}</time>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </nav>

        <div ref={contentPane} className="sm:min-h-0 sm:overflow-y-auto">
          <div className="mx-auto grid max-w-2xl gap-6 px-5 py-6 sm:py-8">
            <h2 className="font-heading text-2xl font-bold tabular-nums">
              {selectedDay ? <time dateTime={selectedDay.date}>{selectedDay.date}</time> : '碎碎念'}
            </h2>

            <div hidden={selectedDay !== undefined}>
              <QuickNoteForm />
            </div>

            {notes.length === 0 && <p className="font-heading text-ink/40">暂无碎碎念</p>}

            {visibleDays.map((day) => (
              <section key={day.date}>
                {!selectedDay && (
                  <h3 className="mb-2 border-b border-ink/10 pb-1 text-xs text-ink/50 tabular-nums">
                    {day.date}
                  </h3>
                )}
                <ul className="grid gap-3">
                  {day.notes.map((note) => {
                    const project = note.projectId === null ? undefined : projects.get(note.projectId)
                    return (
                      <li key={note.id} className="group flex gap-3">
                        <time className="w-10 shrink-0 pt-0.5 text-xs text-ink/40 tabular-nums">
                          {formatTime(note.createdAt)}
                        </time>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm wrap-break-word whitespace-pre-wrap">{note.content}</p>
                          {project && (
                            <button
                              type="button"
                              onClick={() => onOpenProject(project.id)}
                              className="mt-1 text-xs text-gold hover:underline"
                            >
                              {project.name}
                              {project.status === 'archived' && '（已归档）'}
                            </button>
                          )}
                          {!project && !selectedDay && (
                            <span className="mt-1 block text-xs text-ink/40">随手记</span>
                          )}
                        </div>
                        {note.projectId === null && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="opacity-30 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                            onClick={() => handleDelete(note.id)}
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
