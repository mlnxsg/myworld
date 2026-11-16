// 白板上的一个项目文件夹：可以拖动，单击打开详情。

import { useRef, useState } from 'react'
import { moveProject } from '@/db'
import { calcProgress } from '@/progress'
import type { Project, Task } from '@/types'
import ProgressBar from './ProgressBar'

interface Props {
  project: Project
  tasks: Task[] // 这个项目的待办
  onOpen: () => void
}

// 鼠标移动超过这么多像素才算"拖动"，否则算"单击"
const DRAG_THRESHOLD = 4

// 根据 id 算出一个固定的小角度（-2.5° 到 2.5°），让文件夹摆得随意一点。
// 同一个文件夹每次算出来都一样，所以刷新后角度不变。
function tiltOf(id: string): number {
  let sum = 0
  for (const char of id) sum += char.charCodeAt(0)
  return (sum % 51) / 10 - 2.5
}

export default function FolderCard({ project, tasks, onOpen }: Props) {
  // 拖动过程中的临时位置。fromX / fromY 记的是拖动开始时数据库里的位置。
  const [dragPos, setDragPos] = useState<{
    x: number
    y: number
    fromX: number
    fromY: number
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  // 按下鼠标时记下的起点。用 ref 是因为它变化时不需要重新渲染。
  const start = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return // 只响应鼠标左键
    e.currentTarget.setPointerCapture(e.pointerId) // 鼠标移出文件夹也继续收到事件
    start.current = { pointerX: e.clientX, pointerY: e.clientY, x: project.x, y: project.y }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!start.current) return
    const dx = e.clientX - start.current.pointerX
    const dy = e.clientY - start.current.pointerY
    if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

    setDragging(true)
    setDragPos({
      x: Math.max(0, start.current.x + dx), // 不让它拖出白板的左边和上边
      y: Math.max(0, start.current.y + dy),
      fromX: start.current.x,
      fromY: start.current.y,
    })
  }

  function handlePointerUp() {
    if (!start.current) return
    start.current = null

    if (dragging && dragPos) {
      setDragging(false)
      moveProject(project.id, dragPos.x, dragPos.y)
    } else {
      onOpen()
    }
  }

  // 松手后新位置要过一小会儿才写进数据库。在那之前（数据库里还是拖动前的位置）
  // 继续显示临时位置，这样文件夹不会闪回原处。
  const useDragPos = dragPos && dragPos.fromX === project.x && dragPos.fromY === project.y
  const x = useDragPos ? dragPos.x : project.x
  const y = useDragPos ? dragPos.y : project.y
  const { percent } = calcProgress(project.estimatedTotal, tasks)

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`absolute w-44 touch-none select-none ${
        dragging
          ? 'z-50 cursor-grabbing drop-shadow-xl'
          : 'cursor-grab drop-shadow-sm transition-[rotate,filter] duration-200 hover:drop-shadow-md'
      }`}
      style={{ left: x, top: y, rotate: dragging ? '0deg' : `${tiltOf(project.id)}deg` }}
    >
      {/* 文件夹上面的小标签 */}
      <div className="h-3.5 w-16 rounded-t-lg border border-b-0 border-folder-edge bg-folder" />
      {/* 文件夹主体 */}
      <div className="-mt-px rounded-xl rounded-tl-none border border-folder-edge bg-folder p-3">
        <div className="mb-3 line-clamp-2 min-h-10 font-heading text-base leading-5 font-semibold text-ink">
          {project.name}
        </div>
        <ProgressBar percent={percent} />
      </div>
    </div>
  )
}
