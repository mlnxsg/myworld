import { useState } from 'react'
import Board from './components/Board'

export default function App() {
  // 当前在右侧面板里打开的项目；null 表示没有打开
  const [, setOpenProjectId] = useState<string | null>(null)

  return (
    <div className="flex h-screen flex-col text-ink">
      <header className="flex items-center border-b px-5 py-3">
        <h1 className="font-heading text-xl font-bold">我的世界</h1>
      </header>

      <main className="min-h-0 flex-1">
        <Board onOpenProject={setOpenProjectId} />
      </main>
    </div>
  )
}
