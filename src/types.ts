// 整个应用用到的几种数据。和 plan.md 里的"数据结构"一一对应。

export interface Project {
  id: string
  name: string
  estimatedTotal?: number // 预估总工作量分数，选填；没填时计算按 0 处理
  hunches?: Hunch[] // 直觉预判，可以有很多条；写下的每一条都不可修改
  x: number // 白板上的位置
  y: number
  z?: number // 层级：存的是最近一次拖动的时间，越大越靠上
  status: 'active' | 'archived'
  createdAt: number
  archivedAt?: number
  retro?: Retro
}

// 一条直觉预判
export interface Hunch {
  content: string
  createdAt: number
}

export interface Retro {
  learned: string // 这次学到了什么？
  nextTime: string // 下次会怎么做？
}

export type Score = 1 | 2 | 3 | 4 | 5

export interface Task {
  id: string
  projectId: string
  title: string
  score: Score
  done: boolean
  createdAt: number
  doneAt?: number
  dueDate?: string // 第一版不用，为以后的待办提示区预留
}

// 碎碎念
export interface Note {
  id: string
  projectId: string | null // null 表示"随手记"：不属于任何项目的想法
  content: string
  createdAt: number
}

// 成就：自己比较满意的一件事
export interface Achievement {
  id: string
  title: string
  content?: string // 文字，选填
  // 图片，可以有多张，第一张是封面。新记录至少要有一张；早期可能存过没有图片的记录。
  // 每张存的是压缩后的 data URL（一长串以 data:image/jpeg 开头的文字）
  images: string[]
  tags?: string[] // 标签，可以有多个；早期的记录没有这个字段，当作没有标签
  createdAt: number
}

// Ref：存下来的参考资料，文字和图片至少有一样
export interface Reference {
  id: string
  projectId: string | null // null 表示没有项目归属
  text?: string // 文字或链接
  images: string[] // 压缩后的 data URL，可以没有
  viewed?: boolean // 旧记录没有此字段，视为未查看
  createdAt: number
}

// 导出 / 导入用的 JSON 文件格式
export interface BackupFile {
  app: 'myworld'
  // 数据结构变了就加 1。
  // 版本 1：每个项目只有一条 hunch；版本 2：改成 hunches 列表；版本 3：新增 achievements；
  // 版本 4：成就的 image（一张）改成 images（多张）；版本 5：新增 references（Ref 库）
  // 版本 6：Ref 可以没有项目归属，并记录查看状态
  version: 6
  exportedAt: number
  projects: Project[]
  tasks: Task[]
  notes: Note[]
  achievements: Achievement[]
  references: Reference[]
}
