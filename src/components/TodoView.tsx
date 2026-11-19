import { ArrowRight, Pencil, X } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addTodo, deleteTodo, moveTodoToProject, setTodoDone, updateTodo, useProjects, useTodos } from '@/db'
import type { Score, Todo } from '@/types'
import ScorePicker from './ScorePicker'
import TagInput from './TagInput'

const ALL = Symbol('all')
const UNTAGGED = Symbol('untagged')
type Category = string | typeof ALL | typeof UNTAGGED

export default function TodoView() {
  const todos = useTodos()
  const [filter, setFilter] = useState<Category>(ALL)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const moving = todos.find((todo) => todo.id === movingId)
  const deleting = todos.find((todo) => todo.id === deletingId)
  const tags = [...new Set(todos.flatMap((todo) => todo.tags))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const category = typeof filter === 'string' && !tags.includes(filter) ? ALL : filter
  const categories: { value: Category; label: string }[] = [
    { value: ALL, label: '全部' },
    { value: UNTAGGED, label: '无标签' },
    ...tags.map((tag) => ({ value: tag, label: tag })),
  ]
  const shown = category === ALL
    ? todos
    : todos.filter((todo) => category === UNTAGGED ? todo.tags.length === 0 : todo.tags.includes(category))

  return (
    <div className="h-full overflow-y-auto bg-paper">
      <div className="mx-auto grid max-w-2xl gap-5 px-5 py-8">
        <h2 className="font-heading text-2xl font-bold">todo</h2>
        <TodoForm suggestions={tags} onDone={() => setFilter(ALL)} />
        <div role="group" aria-label="按标签分类" className="flex flex-wrap gap-1.5">
          {categories.map(({ value, label }) => (
            <button
              key={typeof value === 'string' ? `tag:${value}` : value.description}
              type="button"
              aria-pressed={category === value}
              onClick={() => {
                setEditingId(null)
                setFilter(value)
              }}
              className="rounded-full border border-ink/15 px-3 py-0.5 text-xs text-ink/70 hover:border-gold aria-pressed:border-gold aria-pressed:bg-folder aria-pressed:text-ink"
            >
              {label}
            </button>
          ))}
        </div>
        <div role="status" className="empty:hidden text-xs text-ink/65">{notice}</div>
        {shown.length === 0 ? (
          <p className="text-sm text-ink/50">暂无待办</p>
        ) : (
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {shown.map((todo) => (
              <li key={todo.id} className="py-2">
                {editingId === todo.id ? (
                  <TodoForm
                    todo={todo}
                    suggestions={tags}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="group flex items-start gap-2">
                    <Checkbox
                      className="mt-1"
                      checked={todo.done}
                      onCheckedChange={(checked) => setTodoDone(todo.id, checked === true)}
                      aria-label={`完成：${todo.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNotice('')
                          setMovingId(todo.id)
                        }}
                        title="转入项目"
                        className="flex w-full cursor-pointer items-start gap-2 rounded text-left text-sm hover:text-gold"
                      >
                        <span className={`min-w-0 wrap-break-word ${todo.done ? 'text-ink/50 line-through' : ''}`}>
                          {todo.title}
                        </span>
                        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-ink/45" aria-hidden="true" />
                      </button>
                      {todo.tags.length > 0 && (
                        <ul aria-label="标签" className="mt-1 flex flex-wrap gap-1">
                          {todo.tags.map((tag) => (
                            <li key={tag} className="rounded bg-folder px-1.5 text-xs text-ink/65">{tag}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex shrink-0 opacity-55 group-focus-within:opacity-100 group-hover:opacity-100">
                      <Button size="icon-xs" variant="ghost" aria-label="编辑待办" onClick={() => setEditingId(todo.id)}>
                        <Pencil />
                      </Button>
                      <Button size="icon-xs" variant="ghost" aria-label="删除待办" onClick={() => setDeletingId(todo.id)}>
                        <X />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={moving !== undefined} onOpenChange={(open) => !open && setMovingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>转入项目</DialogTitle>
            <DialogDescription className="wrap-break-word">{moving?.title}</DialogDescription>
          </DialogHeader>
          {moving && (
            <TransferTodoForm
              todo={moving}
              onCancel={() => setMovingId(null)}
              onMoved={(projectName) => {
                setMovingId(null)
                setNotice(`已转入「${projectName}」`)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== undefined} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除待办？</AlertDialogTitle>
            <AlertDialogDescription className="wrap-break-word">{deleting?.title}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleting && deleteTodo(deleting.id)}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TodoForm({
  todo,
  suggestions,
  onDone,
  onCancel,
}: {
  todo?: Todo
  suggestions: string[]
  onDone: () => void
  onCancel?: () => void
}) {
  const [title, setTitle] = useState(todo?.title ?? '')
  const [tags, setTags] = useState(todo?.tags ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const tagsId = useId()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle || saving) return
    setSaving(true)
    setError(false)
    try {
      if (todo) {
        await updateTodo(todo.id, trimmedTitle, tags)
      } else {
        await addTodo(trimmedTitle, tags)
        setTitle('')
        setTags([])
      }
      onDone()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <Input
        aria-label={todo ? '编辑待办名称' : '新待办'}
        placeholder="新待办"
        autoFocus={todo !== undefined}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={tagsId} className="text-xs text-ink/75">标签</Label>
        <TagInput id={tagsId} value={tags} onChange={setTags} suggestions={suggestions} />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">保存失败，请重试。</p>}
      <div className="flex justify-end gap-1">
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onCancel}>取消</Button>
        )}
        <Button type="submit" size="sm" disabled={!title.trim() || saving}>{todo ? '保存' : '添加'}</Button>
      </div>
    </form>
  )
}

function TransferTodoForm({
  todo,
  onCancel,
  onMoved,
}: {
  todo: Todo
  onCancel: () => void
  onMoved: (projectName: string) => void
}) {
  const projects = useProjects('active')
  const [projectId, setProjectId] = useState('')
  const [score, setScore] = useState<Score | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const projectSelectId = useId()
  const selectedProject = projects.find((project) => project.id === projectId)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedProject || score === null || saving) return
    setSaving(true)
    setError('')
    try {
      const projectName = await moveTodoToProject(todo.id, selectedProject.id, score)
      onMoved(projectName)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '转入失败，请重试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={projectSelectId}>项目</Label>
        <select
          id={projectSelectId}
          value={selectedProject?.id ?? ''}
          onChange={(event) => setProjectId(event.target.value)}
          disabled={saving || projects.length === 0}
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>{projects.length ? '选择项目' : '暂无进行中的项目'}</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink/65">工作量</span>
        <ScorePicker value={score} onChange={setScore} />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onCancel}>取消</Button>
        <Button type="submit" size="sm" disabled={!selectedProject || score === null || saving}>转入</Button>
      </DialogFooter>
    </form>
  )
}
