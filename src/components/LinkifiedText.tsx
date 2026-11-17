// 显示一段文字，其中的网址（http:// 或 https:// 开头的）变成可以点的链接，在新标签页打开。

// 网址到空格或中文标点为止。外面的括号让 split() 把网址本身也留在结果里。
const URL_PATTERN = /(https?:\/\/[^\s，。、；！？）》】"']+)/g

export default function LinkifiedText({ text }: { text: string }) {
  // 例：'看这个 https://a.com 不错' → ['看这个 ', 'https://a.com', ' 不错']
  // 网址总是在单数位置（第 1、3、5… 个）
  const parts = text.split(URL_PATTERN)

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer" // 新页面拿不到这个页面的信息，更安全
            className="break-all text-gold underline underline-offset-2 hover:text-ink"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
