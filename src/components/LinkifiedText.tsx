// 显示一段文字，其中的网址变成可以点的链接，在新标签页打开。
// 怎么认出网址见 src/lib/linkify.ts。

import { splitLinks } from '@/lib/linkify'

export default function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((part, i) =>
        part.href ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noreferrer" // 新页面拿不到这个页面的信息，更安全
            className="break-all text-gold underline underline-offset-2 hover:text-ink"
          >
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
