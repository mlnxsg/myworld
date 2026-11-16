// 白板：展示所有进行中的项目文件夹。双击空白处新建项目。

import { useState } from 'react'
import { useAllTasks, useProjects } from '@/db'
import FolderCard from './FolderCard'
import NewProjectDialog from './NewProjectDialog'

interface Props {
  onOpenProject: (projectId: string) => void
}

// 文件夹的大概尺寸，用来让新文件夹的中心落在双击的位置
const FOLDER_WIDTH = 176
const FOLDER_HEIGHT = 100
// 白板比最远的文件夹再多出这么多空白，方便继续往外摆
const EXTRA_SPACE = 400

export default function Board({ onOpenProject }: Props) {
  const projects = useProjects('active')
  const tasks = useAllTasks()
  const [newPosition, setNewPosition] = useState<{ x: number; y: number } | null>(null)

  function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    // 只有双击"空白处"才新建：双击到文件夹上时 target 是文件夹，不是白板本身
    if (e.target !== e.currentTarget) return

    const rect = e.currentTarget.getBoundingClientRect()
    setNewPosition({
      x: Math.max(0, e.clientX - rect.left - FOLDER_WIDTH / 2),
      y: Math.max(0, e.clientY - rect.top - FOLDER_HEIGHT / 2),
    })
  }

  // 最近拖动过的排在最后，也就显示在最上层
  const sorted = [...projects].sort((a, b) => (a.z ?? a.createdAt) - (b.z ?? b.createdAt))

  // 白板要足够大，能装下所有文件夹；超出窗口时外层会出现滚动条
  const width = Math.max(0, ...projects.map((p) => p.x)) + EXTRA_SPACE
  const height = Math.max(0, ...projects.map((p) => p.y)) + EXTRA_SPACE

  return (
    <div className="h-full overflow-auto bg-paper">
      <div
        onDoubleClick={handleDoubleClick}
        className="board-dots relative min-h-full min-w-full"
        style={{ width, height }}
      >
        {projects.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center font-heading text-ink/40 italic">
            双击空白处，新建一个项目
          </p>
        )}

        {sorted.map((project) => (
          <FolderCard
            key={project.id}
            project={project}
            tasks={tasks.filter((task) => task.projectId === project.id)}
            onOpen={() => onOpenProject(project.id)}
          />
        ))}
      </div>

      <NewProjectDialog position={newPosition} onClose={() => setNewPosition(null)} />
    </div>
  )
}
