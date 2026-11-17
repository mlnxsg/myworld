// 测试数据库从版本 3 升到版本 4：成就的 image（一张）要变成 images（列表），图片不能丢。
// 单独放一个文件，是因为每个测试文件都有自己全新的假 IndexedDB，
// 这样可以先手工造一个"版本 3"的数据库，再让 db.ts 去升级它。

import 'fake-indexeddb/auto'
import { expect, test } from 'vitest'

// 手工造一个"版本 3"的数据库（Dexie 的版本 3 在 IndexedDB 里对应的数字是 30）
function createVersion3Database(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myworld', 30)
    request.onupgradeneeded = () => {
      const database = request.result
      database.createObjectStore('projects', { keyPath: 'id' }).createIndex('status', 'status')
      database.createObjectStore('tasks', { keyPath: 'id' }).createIndex('projectId', 'projectId')
      database.createObjectStore('notes', { keyPath: 'id' }).createIndex('projectId', 'projectId')
      const achievements = database.createObjectStore('achievements', { keyPath: 'id' })
      achievements.add({
        id: 'old-with-image',
        title: '旧成就',
        image: 'data:image/jpeg;base64,OLD',
        tags: ['美食'],
        createdAt: 1,
      })
      achievements.add({ id: 'old-without-image', title: '没图的旧成就', createdAt: 2 })
    }
    request.onsuccess = () => {
      request.result.close()
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

test('打开版本 3 的数据库时，成就的 image 自动变成 images，图片和其他内容都不丢', async () => {
  await createVersion3Database()

  const { exportAll } = await import('./db') // 这时才加载 db.ts，它会发现数据库是旧版本并升级
  const achievements = (await exportAll()).achievements
  const withImage = achievements.find((a) => a.id === 'old-with-image')!
  const withoutImage = achievements.find((a) => a.id === 'old-without-image')!

  expect(withImage.images).toEqual(['data:image/jpeg;base64,OLD'])
  expect('image' in withImage).toBe(false)
  expect(withImage.title).toBe('旧成就')
  expect(withImage.tags).toEqual(['美食'])
  expect(withoutImage.images).toEqual([])
})
