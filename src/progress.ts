import type { Task } from './types'

export interface Progress {
  doneScore: number // 已完成分
  taskTotal: number // 事项总分
  denominator: number // 分母 = max(预估总分, 事项总分)
  percent: number // 完成百分比，0–100 的整数
  overBy: number // 事项总分超出预估多少；没填预估或没超出时为 0
}

// 进度计算。纯函数：同样的输入永远得到同样的结果，不读写任何外部数据。
export function calcProgress(
  estimatedTotal: number | undefined,
  tasks: Pick<Task, 'score' | 'done'>[],
): Progress {
  let doneScore = 0
  let taskTotal = 0
  for (const task of tasks) {
    taskTotal += task.score
    if (task.done) doneScore += task.score
  }

  const denominator = Math.max(estimatedTotal ?? 0, taskTotal)
  const percent = denominator === 0 ? 0 : Math.round((doneScore / denominator) * 100)
  const overBy =
    estimatedTotal !== undefined && taskTotal > estimatedTotal ? taskTotal - estimatedTotal : 0

  return { doneScore, taskTotal, denominator, percent, overBy }
}
