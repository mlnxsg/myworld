// 整个应用用到的三种数据。和 plan.md 里的"数据结构"一一对应。

export interface Project {
  id: string
  name: string
  estimatedTotal?: number // 预估总工作量分数，选填；没填时计算按 0 处理
  hunch?: { content: string; createdAt: number } // 直觉预判，选填；填写后不可修改
  x: number // 白板上的位置
  y: number
  z?: number // 层级：存的是最近一次拖动的时间，越大越靠上
  status: 'active' | 'archived'
  createdAt: number
  archivedAt?: number
  retro?: Retro
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
  projectId: string | null // null 为以后不属于任何项目的想法预留
  content: string
  createdAt: number
}

// 导出 / 导入用的 JSON 文件格式
export interface BackupFile {
  app: 'myworld'
  version: 1 // 以后数据结构变了就加 1，导入时可以据此做转换
  exportedAt: number
  projects: Project[]
  tasks: Task[]
  notes: Note[]
}
