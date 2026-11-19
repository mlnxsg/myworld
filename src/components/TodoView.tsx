import { ArrowRight, Pencil, Plus, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
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
type TodoCategory = string | typeof UNTAGGED
type Category = TodoCategory | typeof ALL

export default function TodoView() {
  const todos = useTodos()
  const [filter, setFilter] = useState<Category>(ALL)
  const [editing, setEditing] = useState<Todo | 'new' | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const formTrigger = useRef<HTMLButtonElement | null>(null)
  const moving = todos.find((todo) => todo.id === movingId)
  const deleting = todos.find((todo) => todo.id === deletingId)
  const todosByCategory = new Map<TodoCategory, Todo[]>()
  for (const todo of todos) {
    const categories: TodoCategory[] = todo.tags.length ? todo.tags : [UNTAGGED]
    for (const category of categories) {
      const items = todosByCategory.get(category)
      if (items) items.push(todo)
      else todosByCategory.set(category, [todo])
    }
  }
  const tags = [...todosByCategory.keys()]
    .filter((tag): tag is string => typeof tag === 'string')
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const category = typeof filter === 'string' && !todosByCategory.has(filter) ? ALL : filter
  const categories: { value: Category; label: string }[] = [
    { value: ALL, label: '全部' },
    { value: UNTAGGED, label: '无标签' },
    ...tags.map((tag) => ({ value: tag, label: tag })),
  ]
  const groups = categories.flatMap(({ value, label }) => {
    if (value === ALL || (category !== ALL && category !== value)) return []
    const items = todosByCategory.get(value)
    if (!items?.length) return []
    const key = typeof value === 'string' ? `tag:${value}` : value.description
    return [{ key, label, items }]
  })

  return (
    <div className="h-full overflow-y-auto bg-paper">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold">todo</h2>
          <Button
            size="sm"
            aria-haspopup="dialog"
            onClick={(event) => {
              formTrigger.current = event.currentTarget
              setEditing('new')
            }}
          >
            <Plus aria-hidden="true" />
            新增
          </Button>
        </div>

        {tags.length > 0 && (
          <div role="group" aria-label="按标签分类" className="mb-5 flex flex-wrap gap-1.5">
            {categories.map(({ value, label }) => (
              <button
                key={typeof value === 'string' ? `tag:${value}` : value.description}
                type="button"
                aria-pressed={category === value}
                onClick={() => setFilter(value)}
                className="rounded-full border border-ink/15 px-3 py-0.5 text-xs text-ink/60 hover:border-gold hover:text-gold aria-pressed:border-gold aria-pressed:bg-gold aria-pressed:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div role="status" className="mb-3 text-xs text-ink/65 empty:hidden">{notice}</div>
        {groups.length === 0 ? (
          <p className="font-heading text-ink/40">暂无待办</p>
        ) : (
          <div className="columns-[20rem] gap-4">
            {groups.map(({ key, label, items }) => (
              <section
                key={key}
                className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-folder-edge bg-white"
              >
                {category === ALL && tags.length > 0 && (
                  <h3 className="border-b border-folder-edge/70 bg-folder/45 px-2.5 py-1.5 text-xs font-medium text-ink/70">
                    {label}
                  </h3>
                )}
                <ul aria-label={label} className="divide-y divide-folder-edge/70">
                  {items.map((todo) => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
                      onMove={() => {
                        setNotice('')
                        setMovingId(todo.id)
                      }}
                      onEdit={(trigger) => {
                        formTrigger.current = trigger
                        setEditing(todo)
                      }}
                      onDelete={() => setDeletingId(todo.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto text-ink sm:max-w-md"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            formTrigger.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {editing === 'new' ? '新增待办' : '编辑待办'}
            </DialogTitle>
            <DialogDescription className="sr-only">填写事项和标签。</DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <TodoForm
              todo={editing === 'new' ? undefined : editing}
              suggestions={tags}
              onDone={() => {
                if (editing === 'new') setFilter(ALL)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={moving !== undefined} onOpenChange={(open) => !open && setMovingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle>转入项目</DialogTitle>
            <DialogDescription className="sr-only">{moving?.title}</DialogDescription>
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

function TodoRow({
  todo,
  onMove,
  onEdit,
  onDelete,
}: {
  todo: Todo
  onMove: () => void
  onEdit: (trigger: HTMLButtonElement) => void
  onDelete: () => void
}) {
  const tagsId = useId()

  return (
    <li className="group flex items-center gap-2 px-2.5 py-1.5">
      <Checkbox
        checked={todo.done}
        onCheckedChange={(checked) => setTodoDone(todo.id, checked === true)}
        aria-label={`完成：${todo.title}`}
      />
      <button
        type="button"
        onClick={onMove}
        title="转入项目"
        aria-label={todo.title}
        aria-describedby={todo.tags.length ? tagsId : undefined}
        className="min-w-0 flex-1 cursor-pointer rounded text-left font-heading text-sm font-semibold wrap-break-word hover:text-gold"
      >
        <span className={todo.done ? 'text-ink/50 line-through' : undefined}>{todo.title}</span>
        {todo.tags.length > 0 && (
          <span id={tagsId} className="font-sans text-xs font-normal text-gold/80">
            {todo.tags.map((tag) => (
              <span key={tag} className="ml-1.5 inline-block max-w-full">#{tag}</span>
            ))}
          </span>
        )}
        <ArrowRight className="ml-1.5 inline-block size-3 align-middle text-ink/45" aria-hidden="true" />
      </button>
      <div className="flex shrink-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="编辑待办"
          aria-haspopup="dialog"
          onClick={(event) => onEdit(event.currentTarget)}
        >
          <Pencil />
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="删除待办" onClick={onDelete}>
          <X />
        </Button>
      </div>
    </li>
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
  onCancel: () => void
}) {
  const [title, setTitle] = useState(todo?.title ?? '')
  const [tags, setTags] = useState(todo?.tags ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const titleId = useId()
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
      }
      onDone()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={titleId}>事项</Label>
        <Input id={titleId} autoFocus value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={tagsId}>标签（选填）</Label>
        <TagInput id={tagsId} value={tags} onChange={setTags} suggestions={suggestions} />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">保存失败，请重试。</p>}
      <DialogFooter>
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={!title.trim() || saving}>保存</Button>
      </DialogFooter>
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
