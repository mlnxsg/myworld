// 测试"旧数据不会丢"：直觉预判从一条（hunch）改成多条（hunches）之后，
// 已有的数据库和旧的备份文件都要能自动转换。
//
// 测试是在 Node 里跑的，没有浏览器，所以用 fake-indexeddb 假装一个 IndexedDB。

import 'fake-indexeddb/auto'
import { expect, test, vi } from 'vitest'

// Node 里也没有 localStorage（导入成功后会用它记"上次备份时间"），造一个最简单的假的。
const fakeStorage = new Map<string, string>()
globalThis.localStorage = {
  getItem: (key: string) => fakeStorage.get(key) ?? null,
  setItem: (key: string, value: string) => void fakeStorage.set(key, value),
} as Storage

const oldHunch ={ content: '旧格式的一条预判', createdAt: 1794800000000 }

// 手工造一个"版本 1"的数据库，里面有一个旧格式的项目。
// （Dexie 的版本 1 在 IndexedDB 里对应的数字是 10。）
function createVersion1Database(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myworld', 10)
    request.onupgradeneeded = () => {
      const database = request.result
      database.createObjectStore('projects', { keyPath: 'id' }).createIndex('status', 'status')
      database.createObjectStore('tasks', { keyPath: 'id' }).createIndex('projectId', 'projectId')
      database.createObjectStore('notes', { keyPath: 'id' }).createIndex('projectId', 'projectId')
      request.transaction!.objectStore('projects').add({
        id: 'old-1',
        name: '旧项目',
        x: 0,
        y: 0,
        status: 'active',
        createdAt: 1,
        hunch: oldHunch,
      })
    }
    request.onsuccess = () => {
      request.result.close()
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

test('打开旧数据库时，hunch 自动变成 hunches，内容不丢', async () => {
  await createVersion1Database()

  // 这时才加载 db.ts，它会发现数据库是旧版本并升级
  const { exportAll } = await import('./db')
  const backup = await exportAll()

  expect(backup.projects).toHaveLength(1)
  expect(backup.projects[0].hunches).toEqual([{ ...oldHunch, id: expect.any(String) }])
  expect('hunch' in backup.projects[0]).toBe(false)
})

test('追加预判：新的排在后面，旧的原样保留', async () => {
  const { addHunch, exportAll } = await import('./db')
  await addHunch('old-1', '第二条')

  const hunches = (await exportAll()).projects[0].hunches!
  expect(hunches).toHaveLength(2)
  expect(hunches[0]).toEqual({ ...oldHunch, id: expect.any(String) })
  expect(hunches[1].content).toBe('第二条')
})

test('版本 1 的备份文件也能导入，hunch 会被转换', async () => {
  const { parseBackup } = await import('./db')
  const oldFile = JSON.stringify({
    app: 'myworld',
    version: 1,
    exportedAt: 1,
    projects: [{ id: 'p', name: '旧备份里的项目', x: 0, y: 0, status: 'active', createdAt: 1, hunch: oldHunch }],
    tasks: [],
    notes: [],
  })

  const backup = parseBackup(oldFile)
  expect(backup?.version).toBe(9)
  expect(backup?.references).toEqual([]) // 旧备份里没有 Ref，补一个空列表
  expect(backup?.achievements).toEqual([]) // 旧备份里没有成就，补一个空列表
  expect(backup?.projects[0].hunches).toEqual([{ ...oldHunch, id: expect.any(String) }])
})

test('成就：新增后能导出，导入后原样回来，删除后消失', async () => {
  const { addAchievement, deleteAchievement, exportAll, importAll, parseBackup } = await import('./db')
  await addAchievement({ title: '红烧肉', content: '第一次没烧糊', images: ['data:image/jpeg;base64,AAAA'] })
  await addAchievement({ title: '两张图', images: ['data:image/jpeg;base64,BBBB', 'data:image/jpeg;base64,CCCC'] })

  const exported = await exportAll()
  expect(exported.achievements).toHaveLength(2)

  // 导出 → 变成文字 → 再读回来导入，内容应该一模一样
  await importAll(parseBackup(JSON.stringify(exported))!)
  const again = await exportAll()
  expect(again.achievements).toEqual(exported.achievements)

  await deleteAchievement(exported.achievements[0].id)
  expect((await exportAll()).achievements).toHaveLength(1)
})

test('成就：编辑时可以改标题、换图片和顺序、换标签，记录时间不变', async () => {
  const { addAchievement, updateAchievement, exportAll } = await import('./db')
  await addAchievement({ title: '原标题', images: ['图A', '图B'], tags: ['美食'] })
  const before = (await exportAll()).achievements.find((a) => a.title === '原标题')!

  await updateAchievement(before.id, {
    title: '新标题',
    content: '补了文字',
    images: ['图B', '图A', '图C'], // 换了封面，又加了一张
    tags: ['美食', '周末'],
  })

  const after = (await exportAll()).achievements.find((a) => a.id === before.id)!
  expect(after.title).toBe('新标题')
  expect(after.content).toBe('补了文字')
  expect(after.images).toEqual(['图B', '图A', '图C'])
  expect(after.tags).toEqual(['美食', '周末'])
  expect(after.createdAt).toBe(before.createdAt)
})

test('版本 3 的备份里，成就的一张图（image）导入时变成 images 列表', async () => {
  const { parseBackup } = await import('./db')
  const v3File = JSON.stringify({
    app: 'myworld',
    version: 3,
    exportedAt: 1,
    projects: [],
    tasks: [],
    notes: [],
    achievements: [
      { id: 'a1', title: '有图', image: 'data:image/jpeg;base64,AAAA', createdAt: 1 },
      { id: 'a2', title: '没图', createdAt: 2 },
    ],
  })

  const backup = parseBackup(v3File)!
  expect(backup.version).toBe(9)
  expect(backup.achievements[0].images).toEqual(['data:image/jpeg;base64,AAAA'])
  expect('image' in backup.achievements[0]).toBe(false)
  expect(backup.achievements[1].images).toEqual([])
})

test('不是备份文件的内容会被拒绝', async () => {
  const { parseBackup } = await import('./db')
  expect(parseBackup('不是 JSON')).toBeNull()
  expect(parseBackup('{"app":"别的应用"}')).toBeNull()
})

test('Ref 库：新增后能导出导入，删除项目时它的 Ref 一起删掉，别的项目不受影响', async () => {
  const { createProject, addReference, deleteReference, deleteProject, exportAll, importAll, parseBackup } =
    await import('./db')
  await createProject({ name: '要删的项目', x: 0, y: 0 })
  await createProject({ name: '留着的项目', x: 0, y: 0 })
  const projects = (await exportAll()).projects
  const doomed = projects.find((p) => p.name === '要删的项目')!
  const kept = projects.find((p) => p.name === '留着的项目')!

  await addReference(doomed.id, { text: 'https://example.com 参考', images: [] })
  await addReference(doomed.id, { images: ['图1', '图2'] })
  await addReference(kept.id, { text: '留着的 Ref', images: ['图3'] })

  // 导出 → 变成文字 → 再导入，Ref原样回来
  const exported = await exportAll()
  expect(exported.references).toHaveLength(3)
  await importAll(parseBackup(JSON.stringify(exported))!)
  expect((await exportAll()).references).toEqual(exported.references)

  // 删项目：它的两条 Ref 一起没了，另一个项目的还在
  await deleteProject(doomed.id)
  const left = (await exportAll()).references
  expect(left).toHaveLength(1)
  expect(left[0].projectId).toBe(kept.id)

  await deleteReference(left[0].id)
  expect((await exportAll()).references).toHaveLength(0)
})

test('Ref 库：编辑时可以删掉一张图、改文字，记录时间不变', async () => {
  const { createProject, addReference, updateReference, exportAll } = await import('./db')
  await createProject({ name: '编辑 Ref 用的项目', x: 0, y: 0 })
  const project = (await exportAll()).projects.find((p) => p.name === '编辑 Ref 用的项目')!
  await addReference(project.id, { text: '原来的说明', images: ['图1', '图2', '图3'] })
  const before = (await exportAll()).references.find((r) => r.projectId === project.id)!

  await updateReference(before.id, { text: undefined, images: ['图1', '图3'] }) // 删掉第 2 张，去掉文字

  const after = (await exportAll()).references.find((r) => r.id === before.id)!
  expect(after.images).toEqual(['图1', '图3'])
  expect(after.text).toBeUndefined()
  expect(after.createdAt).toBe(before.createdAt)
  expect(after.projectId).toBe(project.id)
})

test('Ref 库：支持标记旧 Ref，独立 Ref 和查看状态会随备份恢复', async () => {
  const { addReference, deleteProject, exportAll, importAll, markReferenceViewed, parseBackup } =
    await import('./db')
  const backup = await exportAll()
  const project = backup.projects[0]
  const oldRef = { id: 'old-ref', projectId: project.id, text: '旧 Ref', images: [], createdAt: 1 }
  await importAll(parseBackup(JSON.stringify({ ...backup, version: 5, references: [oldRef] }))!)
  expect((await exportAll()).references[0].viewed).toBeUndefined()
  await markReferenceViewed(oldRef.id)

  await addReference(null, { text: '无项目归属的 Ref', images: [] })
  const standalone = (await exportAll()).references.find((ref) => ref.projectId === null)!
  expect(standalone.viewed).toBe(false)
  await markReferenceViewed(standalone.id)

  const exported = await exportAll()
  await importAll(parseBackup(JSON.stringify(exported))!)
  expect((await exportAll()).references).toEqual(
    expect.arrayContaining([{ ...oldRef, viewed: true }, { ...standalone, viewed: true }]),
  )

  await deleteProject(project.id)
  expect((await exportAll()).references).toEqual([{ ...standalone, viewed: true }])
})

test('只存了无项目归属的 Ref 时也会自动备份', async () => {
  const { addReference, autoBackup, exportAll, importAll } = await import('./db')
  await importAll({
    app: 'myworld', version: 9, exportedAt: 1,
    projects: [], tasks: [], notes: [], achievements: [], references: [], routines: [], todos: [],
  })
  await addReference(null, { text: '只备份这条 Ref', images: [] })
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
  try {
    expect(await autoBackup()).toBe(true)
    const [, request] = fetch.mock.calls[0]
    expect(JSON.parse(String(request?.body)).references).toEqual((await exportAll()).references)
  } finally {
    fetch.mockRestore()
  }
})

test('目标与提醒：能独立编辑和删除时间相同的旧记录，并保留其他改动', async () => {
  const { addHunch, deleteHunch, exportAll, importAll, parseBackup, updateHunch } = await import('./db')
  const backup = parseBackup(JSON.stringify({
    app: 'myworld',
    version: 6,
    exportedAt: 1,
    projects: [{
      id: 'goals', name: '目标与提醒', x: 0, y: 0, status: 'active', createdAt: 1,
      hunches: [
        { content: '第一条', createdAt: 2 },
        { content: '第二条', createdAt: 2 },
      ],
    }],
    tasks: [],
    notes: [],
  }))!
  const [first, second] = backup.projects[0].hunches!
  expect(first.id).not.toBe(second.id)
  await importAll(backup)

  await Promise.all([
    updateHunch('goals', first.id, '编辑后的第一条'),
    deleteHunch('goals', second.id),
    addHunch('goals', '后来添加'),
  ])

  const exported = await exportAll()
  expect(exported.projects[0].hunches).toEqual([
    { ...first, content: '编辑后的第一条' },
    { id: expect.any(String), content: '后来添加', createdAt: expect.any(Number) },
  ])
  expect(parseBackup(JSON.stringify(exported))?.projects).toEqual(exported.projects)
})

test('我的日常：可编辑、删除和备份，旧备份可导入', async () => {
  const { addRoutine, autoBackup, deleteRoutine, exportAll, importAll, parseBackup, updateRoutine } =
    await import('./db')
  const oldBackup = parseBackup(JSON.stringify({
    app: 'myworld', version: 7, exportedAt: 1,
    projects: [], tasks: [], notes: [], achievements: [], references: [],
  }))!
  expect(oldBackup.routines).toEqual([])
  await importAll(oldBackup)

  await addRoutine('早上读书')
  const [entry] = (await exportAll()).routines
  await updateRoutine(entry.id, '早上读书\n晚上散步')
  const exported = await exportAll()
  expect(exported.routines).toEqual([{ ...entry, content: '早上读书\n晚上散步' }])

  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
  try {
    expect(await autoBackup()).toBe(true)
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).routines).toEqual(exported.routines)
  } finally {
    fetch.mockRestore()
  }

  await deleteRoutine(entry.id)
  expect((await exportAll()).routines).toEqual([])
  await importAll(parseBackup(JSON.stringify(exported))!)
  expect((await exportAll()).routines).toEqual(exported.routines)
  await importAll(oldBackup)
  expect((await exportAll()).routines).toEqual([])
})

test('独立待办可随备份恢复，转入项目后保留完成状态且不会重复转入', async () => {
  const {
    addTodo, archiveProject, autoBackup, createProject, exportAll, importAll,
    moveTodoToProject, parseBackup, setTodoDone, updateTodo,
  } = await import('./db')
  const oldBackup = parseBackup(JSON.stringify({
    app: 'myworld', version: 8, exportedAt: 1,
    projects: [], tasks: [], notes: [], achievements: [], references: [], routines: [],
  }))!
  expect(oldBackup.todos).toEqual([])
  await importAll(oldBackup)
  await addTodo('预约取件', ['生活'])
  const [todo] = (await exportAll()).todos
  await setTodoDone(todo.id, true)
  await updateTodo(todo.id, '到驿站取件', ['生活', '外出'])
  const backup = await exportAll()
  expect(backup.todos).toEqual([
    { ...todo, title: '到驿站取件', tags: ['生活', '外出'], done: true, doneAt: expect.any(Number) },
  ])
  expect(backup.tasks).toEqual([])

  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
  try {
    expect(await autoBackup()).toBe(true)
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).todos).toEqual(backup.todos)
  } finally {
    fetch.mockRestore()
  }
  await importAll(oldBackup)
  await importAll(parseBackup(JSON.stringify(backup))!)
  expect((await exportAll()).todos).toEqual(backup.todos)

  await createProject({ name: '进行中', x: 0, y: 0 })
  await createProject({ name: '已归档', x: 0, y: 0 })
  const projects = (await exportAll()).projects
  const active = projects.find((project) => project.name === '进行中')!
  const archived = projects.find((project) => project.name === '已归档')!
  await archiveProject(archived.id)
  await expect(moveTodoToProject(todo.id, archived.id, 3)).rejects.toThrow('已归档或删除')
  expect((await exportAll()).todos).toEqual(backup.todos)
  const attempts = await Promise.allSettled([
    moveTodoToProject(todo.id, active.id, 3),
    moveTodoToProject(todo.id, active.id, 3),
  ])
  expect(attempts.map((attempt) => attempt.status).sort()).toEqual(['fulfilled', 'rejected'])
  const result = await exportAll()
  expect(result.todos).toEqual([])
  expect(result.tasks).toEqual([{
    id: expect.any(String),
    title: '到驿站取件',
    projectId: active.id,
    score: 3,
    done: true,
    createdAt: todo.createdAt,
    doneAt: backup.todos[0].doneAt,
  }])
})
