// 项目详情：从右侧滑出的面板。进行中的项目可以编辑，已归档的项目只读。

import { useState } from 'react'
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
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
  deleteProject,
  renameProject,
  setEstimatedTotal,
  useNotes,
  useProject,
  useTasks,
} from '@/db'
import { calcProgress } from '@/progress'
import HunchSection from './HunchSection'
import NoteList from './NoteList'
import ProgressBar from './ProgressBar'
import ReferenceList from './ReferenceList'
import RetroDialog from './RetroDialog'
import TaskList from './TaskList'

interface Props {
  projectId: string | null // null 表示面板关闭
  onClose: () => void
}

export default function ProjectDetail({ projectId, onClose }: Props) {
  return (
    <Sheet open={projectId !== null} onOpenChange={(open) => !open && onClose()}>
      {/*
        宽度：小屏幕铺满；大一点的屏幕占窗口一半，但不窄于 28rem。
        末尾的 ! 表示"优先用这个"，盖过 Sheet 组件自带的宽度。
        @container：让面板里的内容可以按"面板有多宽"来排版（比如图片格子多排几列），
        而不是按整个窗口有多宽。
      */}
      <SheetContent className="@container w-full! gap-0 overflow-y-auto p-6 text-ink sm:w-1/2! sm:min-w-md sm:max-w-none! sm:p-8">
        {projectId && <DetailBody projectId={projectId} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function DetailBody({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const project = useProject(projectId)
  const tasks = useTasks(projectId)
  const notes = useNotes(projectId)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [archiving, setArchiving] = useState(false)

  if (!project) return null

  const readOnly = project.status === 'archived'
  const progress = calcProgress(project.estimatedTotal, tasks)

  // 输入框失去焦点时保存名称；空的或没变就恢复原样
  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    const name = e.target.value.trim()
    if (name === '' || name === project!.name) {
      e.target.value = project!.name
      return
    }
    renameProject(project!.id, name)
  }

  // 输入框失去焦点时保存预估总分：清空 = 不填；不是正整数就恢复原样
  function handleEstimateBlur(e: React.FocusEvent<HTMLInputElement>) {
    const text = e.target.value.trim()
    if (text === '') {
      setEstimatedTotal(project!.id, undefined)
      return
    }
    const value = Number(text)
    if (!Number.isInteger(value) || value < 1) {
      e.target.value = project!.estimatedTotal?.toString() ?? ''
      return
    }
    setEstimatedTotal(project!.id, value)
  }

  // 在输入框里按回车 = 让它失去焦点，从而触发上面的保存
  function blurOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  async function handleDelete() {
    await deleteProject(project!.id)
    onClose()
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-3 pr-8">
        {/* SheetTitle / SheetDescription 是给读屏软件用的，sr-only 表示画面上不显示 */}
        <SheetTitle className="sr-only">{project.name}</SheetTitle>
        <SheetDescription className="sr-only">项目详情</SheetDescription>

        {readOnly ? (
          <>
            <p className="text-xs text-ink/40">已归档 · 只读</p>
            <h2 className="font-heading text-xl font-bold">{project.name}</h2>
          </>
        ) : (
          <input
            key={project.name}
            defaultValue={project.name}
            onBlur={handleNameBlur}
            onKeyDown={blurOnEnter}
            aria-label="项目名称"
            className="-mx-1 rounded bg-transparent px-1 font-heading text-xl font-bold outline-none hover:bg-ink/5 focus:bg-ink/5"
          />
        )}

        <ProgressBar percent={progress.percent} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/60">
          <span>
            已完成 <b className="tabular-nums">{progress.doneScore}</b> 分
          </span>
          <span>
            事项总分 <b className="tabular-nums">{progress.taskTotal}</b>
          </span>

          {readOnly ? (
            project.estimatedTotal !== undefined && (
              <span>
                预估总分 <b className="tabular-nums">{project.estimatedTotal}</b>
              </span>
            )
          ) : (
            <label className="flex items-center gap-1">
              预估总分
              <input
                key={project.estimatedTotal ?? 'empty'}
                type="number"
                min={1}
                step={1}
                defaultValue={project.estimatedTotal ?? ''}
                placeholder="添加预估"
                onBlur={handleEstimateBlur}
                onKeyDown={blurOnEnter}
                className="w-20 rounded bg-transparent px-1 py-0.5 font-bold tabular-nums outline-none placeholder:font-normal placeholder:text-ink/40 hover:bg-ink/5 focus:bg-ink/5"
              />
            </label>
          )}

          {progress.overBy > 0 && (
            <span className="text-gold">比预估多了 {progress.overBy} 分</span>
          )}
        </div>
      </header>

      <HunchSection project={project} readOnly={readOnly} />
      <TaskList projectId={project.id} tasks={tasks} readOnly={readOnly} />
      <ReferenceList projectId={project.id} readOnly={readOnly} />
      <NoteList projectId={project.id} notes={notes} readOnly={readOnly} />

      {!readOnly && (
        <footer className="flex justify-between border-t border-ink/10 pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            删除项目
          </Button>
          <Button variant="outline" size="sm" onClick={() => setArchiving(true)}>
            归档
          </Button>
        </footer>
      )}

      <RetroDialog
        project={archiving ? project : null}
        mode="archive"
        onClose={() => setArchiving(false)}
        onArchived={onClose}
      />

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{project.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              项目里的待办事项和碎碎念会一起删除，而且无法恢复。如果只是做完了，可以改用归档。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
