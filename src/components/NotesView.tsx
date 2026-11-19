// 说说区：把所有说说汇总在一起，按时间倒序，按天分组。
// - 顶部可以直接记一条"随手记"：不属于任何项目的想法。
// - 项目里的说说在这里只看不改，点项目名可以打开那个项目的详情。
// - 随手记没有别的地方可以管理，所以在这里可以删除。

import { X } from 'lucide-react'
import { Popover } from 'radix-ui'
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
  const projects = new Map(useAllProjects().map((project) => [project.id, project]))

  // 把连续的、同一天的说说放进同一组。notes 已经按时间倒序排好，
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

  return (
    <div className="h-full overflow-y-auto bg-paper sm:overflow-hidden">
      <div className="sm:grid sm:h-full sm:grid-cols-[15rem_minmax(0,1fr)]">
        <aside
          aria-label="日记"
          className="border-b border-ink/10 px-5 py-4 sm:min-h-0 sm:overflow-y-auto sm:border-r sm:border-b-0 sm:py-8"
        >
          <h2 className="font-heading text-base font-semibold">日记</h2>
          {diaryDays.length === 0 ? (
            <p className="mt-3 text-xs text-ink/50">暂无随手记</p>
          ) : (
            <div className="mt-3 max-h-32 overflow-y-auto overscroll-contain sm:max-h-none sm:overflow-visible">
              <ol className="ml-2 border-l border-folder-edge">
                {diaryDays.map((day) => (
                  <DiaryDay key={day.date} date={day.date} notes={day.notes} />
                ))}
              </ol>
            </div>
          )}
        </aside>

        <div className="sm:min-h-0 sm:overflow-y-auto">
          <div className="mx-auto grid max-w-2xl gap-6 px-5 py-6 sm:py-8">
            <h2 className="font-heading text-2xl font-bold">说说</h2>
            <QuickNoteForm />

            {notes.length === 0 && <p className="font-heading text-ink/40">暂无说说</p>}

            {days.map((day) => (
              <section key={day.date}>
                <h3 className="mb-2 border-b border-ink/10 pb-1 text-xs text-ink/50 tabular-nums">
                  {day.date}
                </h3>
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
                        {note.projectId === null && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="opacity-30 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
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
      </div>
    </div>
  )
}

function DiaryDay({ date, notes }: { date: string; notes: Note[] }) {
  return (
    <li className="relative pl-3">
      <Popover.Root>
        <Popover.Trigger className="peer rounded-md px-2 py-1 text-xs text-ink/70 tabular-nums hover:bg-folder aria-expanded:bg-folder aria-expanded:font-semibold aria-expanded:text-ink">
          <time dateTime={date}>{date}</time>
        </Popover.Trigger>
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-folder-edge peer-aria-expanded:bg-gold"
        />
        <Popover.Portal>
          <Popover.Content
            aria-label={`${date} 日记`}
            side="bottom"
            align="start"
            alignOffset={-16}
            sideOffset={4}
            collisionPadding={12}
            className="z-30 max-h-[min(22rem,var(--radix-popover-content-available-height))] w-52 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-lg border border-folder-edge bg-paper px-3 shadow-lg"
          >
            <ul className="divide-y divide-folder-edge/70">
              {[...notes].reverse().map((note) => (
                <li key={note.id} className="grid gap-1 py-2.5">
                  <time className="text-xs text-ink/55 tabular-nums">{formatTime(note.createdAt)}</time>
                  <p className="text-sm wrap-break-word whitespace-pre-wrap">{note.content}</p>
                </li>
              ))}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </li>
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
