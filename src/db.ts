// 所有读写数据的代码都在这个文件里。
// 界面组件只调用这里导出的函数，不直接使用 Dexie。
// 以后要换成后端接口，只需要改这一个文件。

import Dexie, { type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import type { BackupFile, Hunch, Note, Project, Retro, Score, Task } from './types'

const db = new Dexie('myworld') as Dexie & {
  projects: EntityTable<Project, 'id'>
  tasks: EntityTable<Task, 'id'>
  notes: EntityTable<Note, 'id'>
}

// 这里只需要列出"用来查询"的字段（索引），其他字段会自动保存。
db.version(1).stores({
  projects: 'id, status',
  tasks: 'id, projectId',
  notes: 'id, projectId',
})

// 版本 2：直觉预判从"只有一条"（hunch）改成"可以很多条"（hunches）。
// 表的索引没变，只需要把已有的项目转换一下。
db.version(2).upgrade((tx) =>
  tx
    .table('projects')
    .toCollection()
    .modify((project) => upgradeProject(project)),
)

// 把旧格式的项目改成新格式：hunch（一条）→ hunches（列表）。已经是新格式的不受影响。
// 数据库升级和导入旧备份文件时都会用到。
function upgradeProject(project: Project & { hunch?: Hunch }): void {
  if (project.hunch) {
    project.hunches = [project.hunch]
    delete project.hunch
  }
}

function newId(): string {
  return crypto.randomUUID()
}

// ---------- 读取（数据一变，用到它的组件会自动刷新） ----------

export function useProjects(status: Project['status']): Project[] {
  return useLiveQuery(() => db.projects.where('status').equals(status).toArray(), [status]) ?? []
}

export function useProject(id: string): Project | undefined {
  return useLiveQuery(() => db.projects.get(id), [id])
}

export function useAllTasks(): Task[] {
  return useLiveQuery(() => db.tasks.toArray()) ?? []
}

export function useTasks(projectId: string): Task[] {
  return (
    useLiveQuery(() => db.tasks.where('projectId').equals(projectId).sortBy('createdAt'), [
      projectId,
    ]) ?? []
  )
}

// 碎碎念按时间倒序：最新的在最上面
export function useNotes(projectId: string): Note[] {
  return (
    useLiveQuery(
      async () => {
        const notes = await db.notes.where('projectId').equals(projectId).sortBy('createdAt')
        return notes.reverse()
      },
      [projectId],
    ) ?? []
  )
}

// ---------- 项目 ----------

export async function createProject(input: {
  name: string
  x: number
  y: number
  estimatedTotal?: number
  hunch?: string
}): Promise<void> {
  const now = Date.now()
  await db.projects.add({
    id: newId(),
    name: input.name,
    estimatedTotal: input.estimatedTotal,
    hunches: input.hunch ? [{ content: input.hunch, createdAt: now }] : [],
    x: input.x,
    y: input.y,
    z: now,
    status: 'active',
    createdAt: now,
  })
}

export async function renameProject(id: string, name: string): Promise<void> {
  await db.projects.update(id, { name })
}

// 传 undefined 表示清空预估
export async function setEstimatedTotal(id: string, estimatedTotal?: number): Promise<void> {
  await db.projects.update(id, { estimatedTotal })
}

// 直觉预判只能往后追加，没有修改和删除的函数
export async function addHunch(id: string, content: string): Promise<void> {
  const project = await db.projects.get(id)
  if (!project) return
  const hunches = [...(project.hunches ?? []), { content, createdAt: Date.now() }]
  await db.projects.update(id, { hunches })
}

export async function moveProject(id: string, x: number, y: number): Promise<void> {
  await db.projects.update(id, { x, y, z: Date.now() })
}

// retro 不传表示"跳过复盘"：只归档，以前写过的复盘保持原样
export async function archiveProject(id: string, retro?: Retro): Promise<void> {
  await db.projects.update(id, { status: 'archived', archivedAt: Date.now() })
  if (retro) await saveRetro(id, retro)
}

export async function saveRetro(id: string, retro: Retro): Promise<void> {
  await db.projects.update(id, { retro })
}

export async function restoreProject(id: string): Promise<void> {
  await db.projects.update(id, { status: 'active', archivedAt: undefined })
}

// 删除项目时，把它的待办和碎碎念一起删掉。
// transaction 保证三步要么全部成功，要么全部不做。
export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, db.notes, async () => {
    await db.tasks.where('projectId').equals(id).delete()
    await db.notes.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  })
}

// ---------- 待办事项 ----------

export async function addTask(projectId: string, title: string, score: Score): Promise<void> {
  await db.tasks.add({
    id: newId(),
    projectId,
    title,
    score,
    done: false,
    createdAt: Date.now(),
  })
}

export async function updateTask(id: string, title: string, score: Score): Promise<void> {
  await db.tasks.update(id, { title, score })
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  await db.tasks.update(id, { done, doneAt: done ? Date.now() : undefined })
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id)
}

// ---------- 碎碎念 ----------

export async function addNote(projectId: string, content: string): Promise<void> {
  await db.notes.add({ id: newId(), projectId, content, createdAt: Date.now() })
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id)
}

// ---------- 导出 / 导入 ----------

export async function exportAll(): Promise<BackupFile> {
  return {
    app: 'myworld',
    version: 2,
    exportedAt: Date.now(),
    projects: await db.projects.toArray(),
    tasks: await db.tasks.toArray(),
    notes: await db.notes.toArray(),
  }
}

// 检查一个 JSON 是不是我们导出的备份文件。不是的话返回 null。
export function parseBackup(json: string): BackupFile | null {
  try {
    const data = JSON.parse(json)
    const looksRight =
      data?.app === 'myworld' &&
      (data.version === 1 || data.version === 2) &&
      Array.isArray(data.projects) &&
      Array.isArray(data.tasks) &&
      Array.isArray(data.notes)
    if (!looksRight) return null

    // 旧版本的备份也能导入：先转换成现在的格式
    data.projects.forEach(upgradeProject)
    data.version = 2
    return data as BackupFile
  } catch {
    return null
  }
}

// 导入会覆盖现有的全部数据
export async function importAll(backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, db.notes, async () => {
    await db.projects.clear()
    await db.tasks.clear()
    await db.notes.clear()
    await db.projects.bulkAdd(backup.projects)
    await db.tasks.bulkAdd(backup.tasks)
    await db.notes.bulkAdd(backup.notes)
  })
  // 刚导入完，现在的数据和手里那份备份文件一模一样，所以也算"刚备份过"
  markBackedUp()
}

// ---------- 自动备份 ----------

// 把全部数据发给开发服务器，由它存成硬盘上的文件（见项目根目录的 backup-plugin.ts）。
// 成功返回 true。失败不会报错，只是返回 false，下次再试。
export async function autoBackup(): Promise<boolean> {
  const backup = await exportAll()

  // 数据是空的就不备份。万一哪天浏览器数据丢了，不能让一份空白盖掉当天的好备份。
  if (backup.projects.length === 0 && backup.notes.length === 0) return false

  try {
    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backup),
    })
    if (!response.ok) return false
    markBackedUp()
    return true
  } catch {
    return false // 比如开发服务器没开
  }
}

// ---------- 备份提醒 ----------
// "上次备份的时间"不属于项目数据，只是这个浏览器自己的一个小记录，
// 所以放在 localStorage 里（一个简单的"名字 → 文字"小仓库），不进 IndexedDB，也不会被导出。

const LAST_BACKUP_KEY = 'myworld:lastBackupAt'

// 返回上次备份的时间戳；从没备份过则返回 null
export function getLastBackupAt(): number | null {
  const saved = localStorage.getItem(LAST_BACKUP_KEY)
  return saved ? Number(saved) : null
}

// 记下"现在刚备份过"。手动导出或自动备份成功后调用。
export function markBackedUp(): void {
  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
}
