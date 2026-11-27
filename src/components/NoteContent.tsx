import { Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateNote } from '@/db'
import { noteCategories, personalNoteCategory } from '@/lib/note-categories'
import type { Note, NoteCategory } from '@/types'
import FilterChip from './FilterChip'

export default function NoteContent({
  note,
  readOnly,
  deleteAction,
  metadata,
}: {
  note: Note
  readOnly: boolean
  deleteAction?: ReactNode
  metadata?: ReactNode
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [category, setCategory] = useState<NoteCategory>(() => personalNoteCategory(note))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const isPersonalNote = note.projectId === null

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    const content = draft?.trim()
    if (!content || saving || readOnly) return

    setSaving(true)
    setError(false)
    try {
      await updateNote(note.id, content, isPersonalNote ? category : undefined)
      setDraft(null)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  if (!readOnly && draft !== null) {
    return (
      <>
        <form onSubmit={handleSave} className="grid gap-2">
          <Textarea
            autoFocus
            rows={3}
            aria-label="记录内容"
            value={draft}
            readOnly={saving}
            onChange={(event) => setDraft(event.target.value)}
          />
          {isPersonalNote && (
            <fieldset disabled={saving} className="flex flex-wrap gap-1.5">
              <legend className="mb-1 text-xs text-ink/60">记录分类</legend>
              {noteCategories.map(({ value, label }) => (
                <FilterChip key={value} active={category === value} onClick={() => setCategory(value)}>
                  {label}
                </FilterChip>
              ))}
            </fieldset>
          )}
          {error && <p role="alert" className="text-xs text-destructive">保存失败，请重试。</p>}
          <div className="flex justify-end gap-1">
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setDraft(null)}>
              取消
            </Button>
            <Button type="submit" size="sm" disabled={saving || draft.trim() === ''}>
              保存
            </Button>
          </div>
        </form>
        {!isPersonalNote && metadata && <div className="mt-1">{metadata}</div>}
      </>
    )
  }

  return (
    <div className={metadata ? undefined : 'flex items-start gap-1'}>
      <p className="min-w-0 flex-1 text-sm wrap-break-word whitespace-pre-wrap">{note.content}</p>
      {(metadata || !readOnly) && (
        <div className={metadata ? 'mt-1 flex items-center gap-2' : 'flex shrink-0'}>
          {metadata}
          {!readOnly && (
            <div className={metadata ? 'ml-auto flex shrink-0' : 'flex flex-col'}>
              {deleteAction}
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="text-ink/60 hover:text-ink"
                aria-label="编辑这条记录"
                title="编辑这条记录"
                onClick={() => {
                  setError(false)
                  setDraft(note.content)
                  setCategory(personalNoteCategory(note))
                }}
              >
                <Pencil className={metadata ? 'size-2.5' : undefined} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
