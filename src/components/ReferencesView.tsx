import { useState } from 'react'
import { useAllProjects, useAllReferences } from '@/db'
import { formatDate } from '@/lib/format'
import type { Reference } from '@/types'
import { ReferenceCard, ReferenceForm } from './ReferenceList'

interface Props {
  onOpenProject: (projectId: string) => void
  projectDetailOpen: boolean
}

export default function ReferencesView({ onOpenProject, projectDetailOpen }: Props) {
  const references = useAllReferences()
  const projects = new Map(useAllProjects().map((project) => [project.id, project]))
  const [editingId, setEditingId] = useState<string | null>(null)

  const days = new Map<string, Reference[]>()
  for (const reference of references) {
    const date = formatDate(reference.createdAt)
    const day = days.get(date)
    if (day) day.push(reference)
    else days.set(date, [reference])
  }

  return (
    <div className="h-full overflow-auto bg-paper">
      <div className="@container mx-auto grid max-w-2xl gap-6 px-5 py-8">
        <h2 className="font-heading text-2xl font-bold">Ref 库</h2>
        <ReferenceForm projectId={null} pasteEnabled={!projectDetailOpen && editingId === null} />

        {references.length === 0 && <p className="font-heading text-ink/40">暂无 Ref</p>}

        {[...days].map(([date, entries]) => (
          <section key={date}>
            <h3 className="mb-2 border-b border-ink/10 pb-1 text-xs text-ink/50 tabular-nums">
              {date}
            </h3>
            <ul className="grid gap-3">
              {entries.map((reference) => {
                const { projectId } = reference
                const standalone = projectId === null
                const project = standalone ? undefined : projects.get(projectId)
                if (standalone && reference.id === editingId) {
                  return (
                    <li key={reference.id} className="rounded-lg border border-gold/60 bg-white p-2.5">
                      <ReferenceForm
                        projectId={null}
                        reference={reference}
                        onDone={() => setEditingId(null)}
                        pasteEnabled={!projectDetailOpen}
                      />
                    </li>
                  )
                }

                return (
                  <ReferenceCard
                    key={reference.id}
                    reference={reference}
                    onEdit={standalone ? () => setEditingId(reference.id) : undefined}
                    source={
                      project ? (
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
                          {standalone ? '无项目归属' : '找不到项目'}
                        </span>
                      )
                    }
                  />
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
