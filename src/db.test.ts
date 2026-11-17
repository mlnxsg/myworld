// 测试"旧数据不会丢"：直觉预判从一条（hunch）改成多条（hunches）之后，
// 已有的数据库和旧的备份文件都要能自动转换。
//
// 测试是在 Node 里跑的，没有浏览器，所以用 fake-indexeddb 假装一个 IndexedDB。

import 'fake-indexeddb/auto'
import { expect, test } from 'vitest'

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
  expect(backup.projects[0].hunches).toEqual([oldHunch])
  expect('hunch' in backup.projects[0]).toBe(false)
})

test('追加预判：新的排在后面，旧的原样保留', async () => {
  const { addHunch, exportAll } = await import('./db')
  await addHunch('old-1', '第二条')

  const hunches = (await exportAll()).projects[0].hunches!
  expect(hunches).toHaveLength(2)
  expect(hunches[0]).toEqual(oldHunch)
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
  expect(backup?.version).toBe(4)
  expect(backup?.achievements).toEqual([]) // 旧备份里没有成就，补一个空列表
  expect(backup?.projects[0].hunches).toEqual([oldHunch])
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
  expect(backup.version).toBe(4)
  expect(backup.achievements[0].images).toEqual(['data:image/jpeg;base64,AAAA'])
  expect('image' in backup.achievements[0]).toBe(false)
  expect(backup.achievements[1].images).toEqual([])
})

test('不是备份文件的内容会被拒绝', async () => {
  const { parseBackup } = await import('./db')
  expect(parseBackup('不是 JSON')).toBeNull()
  expect(parseBackup('{"app":"别的应用"}')).toBeNull()
})
