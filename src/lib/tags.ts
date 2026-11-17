// 标签相关的小工具

const MAX_TAG_LENGTH = 20

// 整理一下用户输入的标签：去掉首尾空格和开头的 #，太长的截断
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').trim().slice(0, MAX_TAG_LENGTH)
}
