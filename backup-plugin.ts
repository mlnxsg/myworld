// 自动备份用的 Vite 插件。
//
// 浏览器里的网页不能随便往硬盘写文件，但运行 `npm run dev` 的开发服务器是一个
// Node 程序，它可以。所以这里给开发服务器加一个小接口：
//   网页把全部数据 POST 到 /api/backup  →  服务器把它存成 BACKUP_DIR 里的一个 JSON 文件
//
// 每天一个文件（myworld-2026-11-16.json），同一天内反复备份会覆盖当天那一个。
// 旧文件永远不会被自动删除。

import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

// 备份文件放在哪。想换位置改这一行。
const BACKUP_DIR = 'C:/Users/helen/Documents/myworld/backup'

function todayText(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function backupPlugin(): Plugin {
  return {
    name: 'myworld-backup',
    configureServer(server) {
      server.middlewares.use('/api/backup', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('只接受 POST')
          return
        }

        // 只接受从这个应用自己的页面发来的请求，别的网站发来的一律拒绝
        const origin = req.headers.origin
        if (origin !== `http://${req.headers.host}`) {
          res.statusCode = 403
          res.end('来源不对')
          return
        }

        // 请求的内容是一小块一小块到达的，先拼起来
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            // 确认收到的确实是"我的世界"的备份，免得把乱七八糟的东西存进去
            const data = JSON.parse(body)
            if (data?.app !== 'myworld') throw new Error('不是我的世界的备份数据')

            fs.mkdirSync(BACKUP_DIR, { recursive: true }) // 文件夹不存在就创建
            const file = path.join(BACKUP_DIR, `myworld-${todayText()}.json`)
            fs.writeFileSync(file, JSON.stringify(data, null, 2))

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ file }))
          } catch (error) {
            res.statusCode = 500
            res.end(String(error))
          }
        })
      })
    },
  }
}
