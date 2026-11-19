import { ChevronDown, Pencil, Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addRoutine, deleteRoutine, updateRoutine, useRoutines } from '@/db'
import type { Routine } from '@/types'

export default function RoutineNotebook() {
  const routines = useRoutines()
  const [expanded, setExpanded] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const bodyId = useId()

  return (
    <aside
      aria-label="我的日常"
      className={`absolute top-4 right-4 z-10 flex max-h-[calc(100%_-_2rem)] max-w-[calc(100%_-_2rem)] flex-col overflow-hidden rounded-xl border border-folder-edge bg-paper shadow-md ${expanded ? 'w-60 sm:w-68' : ''}`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded(!expanded)}
        className="flex shrink-0 items-center justify-between gap-3 bg-folder px-4 py-3 text-left font-heading text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset"
      >
        我的日常
        <ChevronDown
          aria-hidden="true"
          className={`size-4 text-ink/60 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id={bodyId}
        hidden={!expanded}
        className="min-h-0 overflow-y-auto overscroll-contain border-t border-folder-edge"
      >
        {routines.length === 0 && (
          <p className="mx-4 border-b border-folder-edge py-4 text-sm text-ink/65">
            写下现在的日常，或理想中的安排。
          </p>
        )}
        <ul className="mx-4 divide-y divide-folder-edge">
          {routines.map((routine) => (
            <li key={routine.id} className="py-3">
              {editingId === routine.id ? (
                <RoutineForm routine={routine} onDone={() => setEditingId(null)} />
              ) : (
                <>
                  <p className="text-sm wrap-break-word whitespace-pre-wrap">
                    {routine.content}
                  </p>
                  <div className="mt-1 flex justify-end gap-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="编辑这条日常"
                      onClick={() => setEditingId(routine.id)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="删除这条日常"
                      onClick={() => setDeletingId(routine.id)}
                    >
                      <X />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className={`mx-4 py-3 ${routines.length > 0 ? 'border-t border-folder-edge' : ''}`}>
          <RoutineForm />
        </div>
      </div>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条日常？</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deletingId && deleteRoutine(deletingId)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}

function RoutineForm({ routine, onDone }: { routine?: Routine; onDone?: () => void }) {
  const [content, setContent] = useState(routine?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = content.trim()
    if (!text || saving) return
    setSaving(true)
    setError(false)
    try {
      if (routine) {
        await updateRoutine(routine.id, text)
        onDone?.()
      } else {
        await addRoutine(text)
        setContent('')
      }
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <Textarea
        rows={2}
        autoFocus={Boolean(routine)}
        aria-label={routine ? '编辑日常' : '新增日常'}
        placeholder="写一条日常"
        value={content}
        disabled={saving}
        onChange={(e) => setContent(e.target.value)}
      />
      {error && <p role="alert" className="text-xs text-destructive">保存失败，请重试。</p>}
      <div className="flex justify-end gap-1">
        {routine && (
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onDone}>
            取消
          </Button>
        )}
        <Button type="submit" size="sm" variant="outline" disabled={saving || !content.trim()}>
          {!routine && <Plus aria-hidden="true" />}
          {routine ? '保存' : '添加'}
        </Button>
      </div>
    </form>
  )
}
