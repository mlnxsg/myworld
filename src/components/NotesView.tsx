// 碎碎念区：把所有项目里的碎碎念汇总在一起，按时间倒序，按天分组。
// 这里只看不改；点项目名可以打开那个项目的详情。

import { useAllNotes, useAllProjects } from '@/db'
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

        {notes.length === 0 && (
          <p className="font-heading text-ink/40 italic">
            还没有碎碎念。打开任意一个项目就可以记。
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
                  <li key={note.id} className="flex gap-3">
                    <time className="w-10 shrink-0 pt-0.5 text-xs text-ink/40 tabular-nums">
                      {formatTime(note.createdAt)}
                    </time>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
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
                    </div>
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
