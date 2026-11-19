// 所有读写数据的代码都在这个文件里。
// 界面组件只调用这里导出的函数，不直接使用 Dexie。
// 以后要换成后端接口，只需要改这一个文件。

import Dexie, { type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  Achievement,
  BackupFile,
  Hunch,
  Note,
  Project,
  Reference,
  Retro,
  Routine,
  Score,
  Task,
  Todo,
} from './types'

const db = new Dexie('myworld') as Dexie & {
  projects: EntityTable<Project, 'id'>
  tasks: EntityTable<Task, 'id'>
  notes: EntityTable<Note, 'id'>
  achievements: EntityTable<Achievement, 'id'>
  references: EntityTable<Reference, 'id'>
  routines: EntityTable<Routine, 'id'>
  todos: EntityTable<Todo, 'id'>
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

// 版本 3：新增一张"成就"表。只写新增的表就行，原有的表保持不变。
db.version(3).stores({
  achievements: 'id',
})

// 版本 4：成就的图片从"一张"（image）改成"多张"（images）。表的索引没变，只转换数据。
db.version(4).upgrade((tx) =>
  tx
    .table('achievements')
    .toCollection()
    .modify((achievement) => upgradeAchievement(achievement)),
)

// 版本 5：新增一张"Ref"表，按 projectId 查某个项目的 Ref
db.version(5).stores({
  references: 'id, projectId',
})

// 已有的目标与提醒也需要 ID，避免按时间或列表位置编辑到别的记录。
db.version(6).upgrade((tx) =>
  tx.table('projects').toCollection().modify((project) => assignHunchIds(project)),
)

db.version(7).stores({
  routines: 'id, createdAt',
})

db.version(8).stores({
  todos: 'id, createdAt',
})

// 把旧格式的成就改成新格式：image（一张）→ images（列表）。已经是新格式的不受影响。
// 数据库升级和导入旧备份文件时都会用到。
function upgradeAchievement(achievement: Achievement & { image?: string }): void {
  if (!Array.isArray(achievement.images)) {
    achievement.images = achievement.image ? [achievement.image] : []
  }
  delete achievement.image
}

// 把旧格式的项目改成新格式：hunch（一条）→ hunches（列表）。已经是新格式的不受影响。
// 数据库升级和导入旧备份文件时都会用到。
type LegacyHunch = Omit<Hunch, 'id'> & { id?: string }

function upgradeProject(project: { hunch?: LegacyHunch; hunches?: LegacyHunch[] }): void {
  if (project.hunch) {
    project.hunches = [project.hunch]
    delete project.hunch
  }
}

function assignHunchIds(project: { hunches?: LegacyHunch[] }): void {
  for (const hunch of project.hunches ?? []) {
    hunch.id ??= newId()
  }
}

function newId(): string {
  return crypto.randomUUID()
}

// ---------- 读取（数据一变，用到它的组件会自动刷新） ----------

export function useProjects(status: Project['status']): Project[] {
  return useLiveQuery(() => db.projects.where('status').equals(status).toArray(), [status]) ?? []
}

// 所有项目，不管是进行中还是已归档
export function useAllProjects(): Project[] {
  return useLiveQuery(() => db.projects.toArray()) ?? []
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
// 某个项目的 Ref，最新的在最上面
export function useReferences(projectId: string): Reference[] {
  return (
    useLiveQuery(
      async () => {
        const references = await db.references.where('projectId').equals(projectId).sortBy('createdAt')
        return references.reverse()
      },
      [projectId],
    ) ?? []
  )
}

export function useAllReferences(): Reference[] {
  return (
    useLiveQuery(async () => {
      const references = await db.references.toArray()
      return references.sort((a, b) => b.createdAt - a.createdAt)
    }) ?? []
  )
}

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

// 所有项目的碎碎念汇总，同样是最新的在最上面（碎碎念区用）
export function useAllNotes(): Note[] {
  return (
    useLiveQuery(async () => {
      const notes = await db.notes.toArray()
      return notes.sort((a, b) => b.createdAt - a.createdAt)
    }) ?? []
  )
}

// 所有成就，最新的在最前面
export function useAchievements(): Achievement[] {
  return (
    useLiveQuery(async () => {
      const achievements = await db.achievements.toArray()
      return achievements.sort((a, b) => b.createdAt - a.createdAt)
    }) ?? []
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
    hunches: input.hunch ? [{ id: newId(), content: input.hunch, createdAt: now }] : [],
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

// 在同一个事务里读取并修改列表，避免标签页之间互相覆盖。
export async function addHunch(projectId: string, content: string): Promise<void> {
  const hunch = { id: newId(), content, createdAt: Date.now() }
  await db.projects.where('id').equals(projectId).modify((project) => {
    project.hunches = [...(project.hunches ?? []), hunch]
  })
}

export async function updateHunch(projectId: string, hunchId: string, content: string): Promise<void> {
  await db.projects.where('id').equals(projectId).modify((project) => {
    const hunch = project.hunches?.find((entry) => entry.id === hunchId)
    if (hunch) hunch.content = content
  })
}

export async function deleteHunch(projectId: string, hunchId: string): Promise<void> {
  await db.projects.where('id').equals(projectId).modify((project) => {
    project.hunches = project.hunches?.filter((entry) => entry.id !== hunchId)
  })
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

// 删除项目时，把它的待办、碎碎念和 Ref 一起删掉。
// transaction 保证这几步要么全部成功，要么全部不做。
export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, db.notes, db.references, async () => {
    await db.tasks.where('projectId').equals(id).delete()
    await db.notes.where('projectId').equals(id).delete()
    await db.references.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  })
}

// ---------- Ref 库 ----------

// 文字和图片至少要有一样（由界面保证）
export async function addReference(
  projectId: string | null,
  input: { text?: string; images: string[] },
): Promise<void> {
  await db.references.add({
    id: newId(),
    projectId,
    text: input.text,
    images: input.images,
    viewed: false,
    createdAt: Date.now(),
  })
}

// 编辑：用新的文字和图片替换。text 为 undefined 表示去掉文字。记录的时间不变。
export async function updateReference(
  id: string,
  input: { text?: string; images: string[] },
): Promise<void> {
  await db.references.update(id, { text: input.text, images: input.images })
}

export async function deleteReference(id: string): Promise<void> {
  await db.references.delete(id)
}

export async function markReferenceViewed(id: string): Promise<void> {
  await db.references.update(id, { viewed: true })
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

// ---------- 独立待办 ----------

export function useTodos(): Todo[] {
  return useLiveQuery(() => db.todos.orderBy('createdAt').reverse().toArray()) ?? []
}

export async function addTodo(title: string, tags: string[]): Promise<void> {
  await db.todos.add({ id: newId(), title, tags, done: false, createdAt: Date.now() })
}

export async function updateTodo(id: string, title: string, tags: string[]): Promise<void> {
  await db.todos.update(id, { title, tags })
}

export async function setTodoDone(id: string, done: boolean): Promise<void> {
  await db.todos.update(id, { done, doneAt: done ? Date.now() : undefined })
}

export async function deleteTodo(id: string): Promise<void> {
  await db.todos.delete(id)
}

export async function moveTodoToProject(id: string, projectId: string, score: Score): Promise<string> {
  return db.transaction('rw', db.todos, db.projects, db.tasks, async () => {
    const todo = await db.todos.get(id)
    if (!todo) throw new Error('这条待办已不存在。')
    const project = await db.projects.get(projectId)
    if (project?.status !== 'active') throw new Error('这个项目已归档或删除，请重新选择。')

    await db.tasks.add({
      id: newId(),
      projectId,
      title: todo.title,
      score,
      done: todo.done,
      doneAt: todo.doneAt,
      createdAt: todo.createdAt,
    })
    await db.todos.delete(id)
    return project.name
  })
}

// ---------- 碎碎念 ----------

// projectId 传 null 表示"随手记"：不属于任何项目的碎碎念
export async function addNote(projectId: string | null, content: string): Promise<void> {
  await db.notes.add({ id: newId(), projectId, content, createdAt: Date.now() })
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id)
}

// ---------- 成就 ----------

// 新增和编辑成就时填写的内容
export interface AchievementInput {
  title: string
  content?: string
  images: string[] // 第一张是封面
  tags?: string[]
}

export async function addAchievement(input: AchievementInput): Promise<void> {
  await db.achievements.add({
    id: newId(),
    title: input.title,
    content: input.content,
    images: input.images,
    tags: input.tags ?? [],
    createdAt: Date.now(),
  })
}

// 编辑：用新内容替换。content 为 undefined 表示去掉它。记录的时间不变。
export async function updateAchievement(id: string, input: AchievementInput): Promise<void> {
  await db.achievements.update(id, {
    title: input.title,
    content: input.content,
    images: input.images,
    tags: input.tags ?? [],
  })
}

export async function deleteAchievement(id: string): Promise<void> {
  await db.achievements.delete(id)
}

// ---------- 我的日常 ----------

export function useRoutines(): Routine[] {
  return useLiveQuery(() => db.routines.orderBy('createdAt').toArray()) ?? []
}

export async function addRoutine(content: string): Promise<void> {
  await db.routines.add({ id: newId(), content, createdAt: Date.now() })
}

export async function updateRoutine(id: string, content: string): Promise<void> {
  await db.routines.update(id, { content })
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.routines.delete(id)
}

// ---------- 导出 / 导入 ----------

export async function exportAll(): Promise<BackupFile> {
  return db.transaction('r', db.tables, async () => ({
    app: 'myworld',
    version: 9,
    exportedAt: Date.now(),
    projects: await db.projects.toArray(),
    tasks: await db.tasks.toArray(),
    notes: await db.notes.toArray(),
    achievements: await db.achievements.toArray(),
    references: await db.references.toArray(),
    routines: await db.routines.toArray(),
    todos: await db.todos.toArray(),
  }))
}

// 检查一个 JSON 是不是我们导出的备份文件。不是的话返回 null。
export function parseBackup(json: string): BackupFile | null {
  try {
    const data = JSON.parse(json)
    const looksRight =
      data?.app === 'myworld' &&
      [1, 2, 3, 4, 5, 6, 7, 8, 9].includes(data.version) &&
      Array.isArray(data.projects) &&
      Array.isArray(data.tasks) &&
      Array.isArray(data.notes) &&
      (data.version < 8 || Array.isArray(data.routines)) &&
      (data.version < 9 || Array.isArray(data.todos))
    if (!looksRight) return null

    // 旧版本的备份也能导入：先转换成现在的格式
    data.projects.forEach(upgradeProject)
    data.projects.forEach(assignHunchIds)
    if (!Array.isArray(data.achievements)) data.achievements = [] // 版本 3 之前没有成就
    data.achievements.forEach(upgradeAchievement)
    if (!Array.isArray(data.references)) data.references = [] // 版本 5 之前没有 Ref 库
    if (!Array.isArray(data.routines)) data.routines = [] // 版本 8 之前没有「我的日常」
    if (!Array.isArray(data.todos)) data.todos = [] // 版本 9 之前没有独立待办
    data.version = 9
    return data as BackupFile
  } catch {
    return null
  }
}

// 导入会覆盖现有的全部数据
export async function importAll(backup: BackupFile): Promise<void> {
  const tables = [db.projects, db.tasks, db.notes, db.achievements, db.references, db.routines, db.todos]
  await db.transaction('rw', tables, async () => {
    for (const table of tables) await table.clear()
    await db.projects.bulkAdd(backup.projects)
    await db.tasks.bulkAdd(backup.tasks)
    await db.notes.bulkAdd(backup.notes)
    await db.achievements.bulkAdd(backup.achievements)
    await db.references.bulkAdd(backup.references)
    await db.routines.bulkAdd(backup.routines)
    await db.todos.bulkAdd(backup.todos)
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
  const isEmpty =
    backup.projects.length === 0 &&
    backup.notes.length === 0 &&
    backup.achievements.length === 0 &&
    backup.references.length === 0 &&
    backup.routines.length === 0 &&
    backup.todos.length === 0
  if (isEmpty) return false

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
