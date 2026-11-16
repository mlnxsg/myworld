// 归档区：列出所有已归档的项目和它们的复盘。

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { restoreProject, useAllTasks, useProjects } from '@/db'
import { formatDate } from '@/lib/format'
import { calcProgress } from '@/progress'
import type { Project, Task } from '@/types'
import { HunchQuote } from './HunchSection'
import RetroDialog from './RetroDialog'

interface Props {
  onOpenProject: (projectId: string) => void
}

export default function ArchiveView({ onOpenProject }: Props) {
  const projects = useProjects('archived')
  const tasks = useAllTasks()
  const [editingRetroOf, setEditingRetroOf] = useState<Project | null>(null)

  // 最近归档的排在最前面
  const sorted = [...projects].sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))

  return (
    <div className="h-full overflow-auto bg-paper">
      <div className="mx-auto grid max-w-2xl gap-4 px-5 py-8">
        <h2 className="font-heading text-2xl font-bold">归档区</h2>

        {sorted.length === 0 && (
          <p className="font-heading text-ink/40 italic">还没有归档的项目。</p>
        )}

        {sorted.map((project) => (
          <ArchivedCard
            key={project.id}
            project={project}
            tasks={tasks.filter((task) => task.projectId === project.id)}
            onOpen={() => onOpenProject(project.id)}
            onEditRetro={() => setEditingRetroOf(project)}
          />
        ))}
      </div>

      <RetroDialog project={editingRetroOf} mode="edit" onClose={() => setEditingRetroOf(null)} />
    </div>
  )
}

function ArchivedCard({
  project,
  tasks,
  onOpen,
  onEditRetro,
}: {
  project: Project
  tasks: Task[]
  onOpen: () => void
  onEditRetro: () => void
}) {
  const progress = calcProgress(project.estimatedTotal, tasks)
  // 两个问题都没填，就当作还没写复盘
  const hasRetro = Boolean(project.retro?.learned || project.retro?.nextTime)

  return (
    <article className="grid gap-3 rounded-xl border border-folder-edge bg-white p-5">
      <header>
        <h3 className="font-heading text-lg font-semibold">{project.name}</h3>
        <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink/50 tabular-nums">
          {project.archivedAt && <span>归档于 {formatDate(project.archivedAt)}</span>}
          <span>事项总分 {progress.taskTotal}</span>
          {project.estimatedTotal !== undefined && <span>预估总分 {project.estimatedTotal}</span>}
          <span>完成 {progress.percent}%</span>
        </p>
      </header>

      {project.hunch && <HunchQuote hunch={project.hunch} />}

      {hasRetro ? (
        <dl className="grid gap-2 text-sm">
          <RetroAnswer question="这次学到了什么？" answer={project.retro?.learned} />
          <RetroAnswer question="下次会怎么做？" answer={project.retro?.nextTime} />
        </dl>
      ) : (
        <p className="text-sm text-ink/40">还没写复盘。</p>
      )}

      <footer className="flex flex-wrap gap-1 border-t border-ink/5 pt-3">
        <Button size="sm" variant="ghost" onClick={onOpen}>
          查看详情
        </Button>
        <Button size="sm" variant="ghost" onClick={onEditRetro}>
          {hasRetro ? '修改复盘' : '补写复盘'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => restoreProject(project.id)}>
          恢复到白板
        </Button>
      </footer>
    </article>
  )
}

function RetroAnswer({ question, answer }: { question: string; answer?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink/50">{question}</dt>
      <dd className="whitespace-pre-wrap">{answer || <span className="text-ink/30">（没填）</span>}</dd>
    </div>
  )
}
