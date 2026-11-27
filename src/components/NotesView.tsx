// 记录区：把所有记录按天分组，以时间倒序排列。
// - 顶部可以直接记一条"随手记"：不属于任何项目的想法。
// - 点项目名可以打开项目详情。
// - 随手记没有别的地方可以管理，所以在这里可以删除。

import { X } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { addNote, deleteNote, useAllNotes, useAllProjects } from '@/db'
import { formatDate, formatTime, formatWeekday } from '@/lib/format'
import { noteCategories, personalNoteCategory } from '@/lib/note-categories'
import type { Note, NoteCategory } from '@/types'
import DeleteConfirmation from './DeleteConfirmation'
import FilterChip from './FilterChip'
import NoteContent from './NoteContent'

interface Props {
  onOpenProject: (projectId: string) => void
}

const noteFilters = [
  { value: 'all', label: '全部' },
  { value: 'project', label: '项目' },
  ...noteCategories,
] as const

function noteCategory(note: Note) {
  return note.projectId === null ? personalNoteCategory(note) : 'project'
}

export default function NotesView({ onOpenProject }: Props) {
  const notes = useAllNotes()
  const projects = new Map(useAllProjects().map((project) => [project.id, project]))
  const [filter, setFilter] = useState<(typeof noteFilters)[number]['value']>('all')

  // 补写的随手记可能比同一天的其他记录晚录入，按日记日期归组。
  const notesByDate = new Map<string, Note[]>()
  for (const note of notes) {
    const date = note.diaryDate ?? formatDate(note.createdAt)
    const group = notesByDate.get(date)
    if (group) group.push(note)
    else notesByDate.set(date, [note])
  }
  const days = [...notesByDate].sort(([a], [b]) => b.localeCompare(a))

  const diaryDays = days
    .map(([date, notes]) => ({ date, notes: notes.filter((note) => noteCategory(note) === 'diary') }))
    .filter((day) => day.notes.length > 0)

  const visibleDays = filter === 'all' ? days : days
    .map(([date, notes]) => [
      date,
      notes.filter((note) => noteCategory(note) === filter),
    ] as const)
    .filter(([, notes]) => notes.length > 0)

  return (
    <div className="h-full overflow-y-auto bg-paper sm:overflow-hidden">
      <div className="sm:grid sm:h-full sm:grid-cols-[15rem_minmax(0,1fr)]">
        <aside
          aria-label="日记"
          className="border-b border-ink/10 px-5 py-4 sm:min-h-0 sm:overflow-y-auto sm:border-r sm:border-b-0 sm:py-8"
        >
          <h2 className="font-heading text-base font-semibold">日记</h2>
          {diaryDays.length === 0 ? (
            <p className="mt-3 text-xs text-ink/50">暂无日记</p>
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
            <h2 className="font-heading text-2xl font-bold">记录</h2>
            <QuickNoteForm />

            <div role="group" aria-label="记录筛选" className="flex flex-wrap gap-1.5">
              {noteFilters.map(({ value, label }) => (
                <FilterChip
                  key={value}
                  active={filter === value}
                  onClick={() => setFilter((current) => current === value ? 'all' : value)}
                >
                  {label}
                </FilterChip>
              ))}
            </div>

            {visibleDays.length === 0 && <p className="font-heading text-ink/40">暂无记录</p>}

            {visibleDays.map(([date, notes]) => (
              <section key={date}>
                <h3 className="mb-2 border-b border-ink/10 pb-1 text-xs text-ink/50 tabular-nums">
                  <time dateTime={date}>{date} {formatWeekday(date)}</time>
                </h3>
                <ul className="grid gap-3">
                  {notes.map((note) => {
                    const project = note.projectId === null ? undefined : projects.get(note.projectId)
                    return (
                      <li key={note.id} className="group flex gap-3">
                        <div className="w-10 shrink-0 pt-0.5 text-xs text-ink/40 tabular-nums">
                          {!note.diaryDate && <time>{formatTime(note.createdAt)}</time>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <NoteContent
                            note={note}
                            readOnly={note.projectId !== null && project?.status !== 'active'}
                            deleteAction={note.projectId === null && (
                              <DeleteConfirmation
                                title="删除这条随手记？"
                                description={note.content}
                                onConfirm={() => deleteNote(note.id)}
                              >
                                <Button
                                  type="button"
                                  size="icon-xs"
                                  variant="ghost"
                                  className="opacity-30 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                                  aria-label="删除这条随手记"
                                >
                                  <X className="size-2.5" />
                                </Button>
                              </DeleteConfirmation>
                            )}
                            metadata={project ? (
                              <button
                                type="button"
                                onClick={() => onOpenProject(project.id)}
                                className="text-xs text-gold hover:underline"
                              >
                                {project.name}
                                {project.status === 'archived' && '（已归档）'}
                              </button>
                            ) : (
                              <span className="text-xs text-ink/40">
                                {noteFilters.find(({ value }) => value === noteCategory(note))?.label}
                              </span>
                            )}
                          />
                        </div>
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
          <time dateTime={date}>{date} {formatWeekday(date)}</time>
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
                  {!note.diaryDate && (
                    <time className="text-xs text-ink/55 tabular-nums">{formatTime(note.createdAt)}</time>
                  )}
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
  const [selectedDate, setSelectedDate] = useState(() => formatDate(Date.now()))
  const [choosingCategory, setChoosingCategory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const canSubmit = content.trim() !== '' && selectedDate !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || saving) return
    setError(false)
    setChoosingCategory(true)
  }

  async function saveNote(category: NoteCategory) {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(false)
    try {
      const today = formatDate(Date.now())
      const diaryDate = selectedDate === today ? undefined : selectedDate
      await addNote(null, content.trim(), diaryDate, category)
      setContent('')
      setSelectedDate(today)
      setChoosingCategory(false)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={choosingCategory} onOpenChange={(open) => !saving && setChoosingCategory(open)}>
      <form onSubmit={handleSubmit} className="grid gap-2">
        <Textarea
          ref={contentRef}
          rows={2}
          placeholder="随手记"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="bg-white"
        />
        <div className="flex items-center justify-end gap-2">
          <div className="relative flex h-8 items-center gap-1.5 rounded-lg border border-input bg-white text-base whitespace-nowrap text-ink/70 tabular-nums focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:text-sm">
            <Input
              type="date"
              aria-label="记录日期"
              aria-describedby={selectedDate ? 'diary-date-weekday' : undefined}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="h-full w-auto border-0 bg-transparent focus-visible:ring-0 [&[data-has-weekday]::-webkit-datetime-edit]:pr-[2.75em]"
              data-has-weekday={selectedDate ? '' : undefined}
            />
            {selectedDate && (
              <span
                id="diary-date-weekday"
                className="pointer-events-none mr-2.5 supports-[selector(input::-webkit-datetime-edit)]:absolute supports-[selector(input::-webkit-datetime-edit)]:right-[1.375rem]"
              >
                {formatWeekday(selectedDate)}
              </span>
            )}
          </div>
          <Button type="submit" size="sm" disabled={!canSubmit || saving}>
            添加
          </Button>
        </div>
      </form>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          contentRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>选择记录分类</DialogTitle>
          <DialogDescription>选择一个分类即可保存。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {noteCategories.map(({ value, label }) => (
            <Button key={value} type="button" variant="outline" disabled={saving} onClick={() => saveNote(value)}>
              {label}
            </Button>
          ))}
        </div>
        {error && <p role="alert" className="text-xs text-destructive">保存失败，请重试。</p>}
      </DialogContent>
    </Dialog>
  )
}
