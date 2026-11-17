// 把一段文字切成"普通文字"和"网址"两种片段，界面再把网址显示成链接。
// 纯函数，不碰界面，方便单独测试。

export interface TextPart {
  text: string // 显示出来的文字
  href?: string // 有这个就是链接，点了打开这个地址
}

// 网址里不会出现的字符：空白、中文标点、引号、尖括号。遇到它们网址就结束。
const STOP = '[^\\s，。、；：！？（）《》【】“”‘’"\'<>]'

// 认得三种写法：
// 1. 带 http:// 或 https:// 的
// 2. www. 开头的
// 3. 没有前缀、但以常见后缀结尾的域名，比如 baidu.com、github.com/xxx、gov.cn
//    前面不能紧挨着 @ 或字母数字（避免把邮箱 me@qq.com 里的 qq.com 认成网址）
const LINK_PATTERN = new RegExp(
  [
    `https?:\\/\\/${STOP}+`,
    `(?<![@\\w.\\/-])www\\.${STOP}+`,
    `(?<![@\\w.\\/-])(?:[a-z0-9-]+\\.)+` +
      `(?:com|cn|net|org|io|dev|ai|me|app|co|xyz|top|info|edu|gov|tv|cc)` +
      `(?![a-z0-9-])(?:\\/${STOP}*)?`,
  ].join('|'),
  'gi',
)

// 网址末尾的英文标点通常是句子的标点，不算网址的一部分，比如 "看 https://a.com." 里的点
const TRAILING_PUNCTUATION = /[.,:;!?)\]]+$/

export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = []
  let position = 0 // 已经处理到第几个字

  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index
    const link = match[0].replace(TRAILING_PUNCTUATION, '')
    if (link === '') continue

    if (start > position) parts.push({ text: text.slice(position, start) })
    // 没写 http(s):// 的，点的时候补上 https://，否则浏览器会把它当成本站里的一个路径
    const href = /^https?:\/\//i.test(link) ? link : `https://${link}`
    parts.push({ text: link, href })
    position = start + link.length
  }

  if (position < text.length) parts.push({ text: text.slice(position) })
  return parts
}
