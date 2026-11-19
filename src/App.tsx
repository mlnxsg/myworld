import { useEffect, useState } from 'react'
import AchievementsView from './components/AchievementsView'
import ArchiveView from './components/ArchiveView'
import Board from './components/Board'
import DataButtons from './components/DataButtons'
import NotesView from './components/NotesView'
import ProjectDetail from './components/ProjectDetail'
import ReferencesView from './components/ReferencesView'
import StatusBar from './components/StatusBar'
import { autoBackup } from './db'

type View = 'board' | 'archive' | 'notes' | 'references' | 'achievements'

// 每隔多久自动备份一次
const BACKUP_EVERY = 10 * 60 * 1000 // 10 分钟

export default function App() {
  // 当前显示哪个区
  const [view, setView] = useState<View>('board')
  // 当前在右侧面板里打开的项目；null 表示没有打开
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)

  // 自动备份：打开页面时备份一次，之后每 10 分钟一次
  useEffect(() => {
    autoBackup()
    const timer = setInterval(autoBackup, BACKUP_EVERY)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex h-screen flex-col text-ink">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-5 py-3">
        <h1 className="font-heading text-xl font-bold">我的世界</h1>

        <nav className="order-last flex basis-full flex-wrap gap-x-4 gap-y-2 text-sm sm:order-none sm:basis-auto">
          <NavButton active={view === 'board'} onClick={() => setView('board')}>
            白板
          </NavButton>
          <NavButton active={view === 'archive'} onClick={() => setView('archive')}>
            归档区
          </NavButton>
          <NavButton active={view === 'notes'} onClick={() => setView('notes')}>
            碎碎念
          </NavButton>
          <NavButton active={view === 'references'} onClick={() => setView('references')}>
            Ref 库
          </NavButton>
          <NavButton active={view === 'achievements'} onClick={() => setView('achievements')}>
            经验总结
          </NavButton>
        </nav>

        <div className="ml-auto">
          <DataButtons />
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {view === 'board' && <Board onOpenProject={setOpenProjectId} />}
        {view === 'archive' && <ArchiveView onOpenProject={setOpenProjectId} />}
        {view === 'notes' && <NotesView onOpenProject={setOpenProjectId} />}
        {view === 'references' && (
          <ReferencesView onOpenProject={setOpenProjectId} projectDetailOpen={openProjectId !== null} />
        )}
        {view === 'achievements' && <AchievementsView />}
      </main>

      <StatusBar />

      <ProjectDetail projectId={openProjectId} onClose={() => setOpenProjectId(null)} />
    </div>
  )
}

// 顶部的导航按钮：当前所在的那个下面有一条金色的线
function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-0.5 transition-colors ${
        active ? 'border-gold text-ink' : 'border-transparent text-ink/50 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
