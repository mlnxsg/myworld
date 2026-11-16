// 项目详情里的"待办事项"部分。

import { Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { addTask, deleteTask, setTaskDone, updateTask } from '@/db'
import type { Score, Task } from '@/types'

const SCORES: Score[] = [1, 2, 3, 4, 5]

interface Props {
  projectId: string
  tasks: Task[]
  readOnly: boolean
}

export default function TaskList({ projectId, tasks, readOnly }: Props) {
  return (
    <section>
      <h3 className="mb-2 font-heading text-base font-semibold">待办事项</h3>

      {!readOnly && <AddTaskForm projectId={projectId} />}

      {tasks.length === 0 ? (
        <p className="py-2 text-sm text-ink/40">还没有事项。</p>
      ) : (
        <ul className="mt-2">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} readOnly={readOnly} />
          ))}
        </ul>
      )}
    </section>
  )
}

// 选工作量分数的五个小圆按钮
function ScorePicker({
  value,
  onChange,
}: {
  value: Score | null
  onChange: (score: Score) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {SCORES.map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          aria-label={`${score} 分`}
          aria-pressed={value === score}
          className={`size-6 rounded-full border text-xs transition-colors ${
            value === score
              ? 'border-gold bg-gold text-white'
              : 'border-ink/15 text-ink/60 hover:border-gold hover:text-gold'
          }`}
        >
          {score}
        </button>
      ))}
    </div>
  )
}

function AddTaskForm({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('')
  const [score, setScore] = useState<Score | null>(null) // 必须自己选，没有默认值

  const canSubmit = title.trim() !== '' && score !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim() === '' || score === null) return
    await addTask(projectId, title.trim(), score)
    setTitle('')
    setScore(null)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <Input placeholder="要做什么？" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-ink/50">
          工作量
          <ScorePicker value={score} onChange={setScore} />
        </div>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          添加
        </Button>
      </div>
    </form>
  )
}

function TaskRow({ task, readOnly }: { task: Task; readOnly: boolean }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [score, setScore] = useState<Score>(task.score)

  function startEditing() {
    setTitle(task.title)
    setScore(task.score)
    setEditing(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim() === '') return
    await updateTask(task.id, title.trim(), score)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="border-b border-ink/5 py-2">
        <form onSubmit={handleSave} className="grid gap-2">
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex items-center justify-between">
            <ScorePicker value={score} onChange={setScore} />
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={title.trim() === ''}>
                保存
              </Button>
            </div>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-2 border-b border-ink/5 py-2">
      <Checkbox
        checked={task.done}
        disabled={readOnly}
        onCheckedChange={(checked) => setTaskDone(task.id, checked === true)}
        aria-label={`完成：${task.title}`}
      />
      <span className={`flex-1 text-sm ${task.done ? 'text-ink/40 line-through' : ''}`}>
        {task.title}
      </span>
      <span className="text-xs text-ink/50 tabular-nums">{task.score} 分</span>

      {!readOnly && (
        // 编辑和删除按钮平时是淡的，鼠标移到这一行上才明显
        <div className="flex opacity-30 transition-opacity group-hover:opacity-100">
          <Button size="icon-xs" variant="ghost" onClick={startEditing} aria-label="编辑事项">
            <Pencil />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => deleteTask(task.id)}
            aria-label="删除事项"
          >
            <X />
          </Button>
        </div>
      )}
    </li>
  )
}
