// 标签输入：已选的标签显示成小方块，可以点 × 去掉；
// 输入框里打字后按回车（或逗号）加一个新标签；下面列出用过的标签，点一下就加上。

import { X } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { normalizeTag } from '@/lib/tags'

interface Props {
  id?: string
  value: string[] // 已选的标签
  onChange: (tags: string[]) => void
  suggestions: string[] // 用过的所有标签，用得多的在前
}

export default function TagInput({ id, value, onChange, suggestions }: Props) {
  const [draft, setDraft] = useState('')

  function add(raw: string) {
    const tag = normalizeTag(raw)
    if (tag !== '' && !value.includes(tag)) onChange([...value, tag])
    setDraft('')
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // 回车、英文逗号、中文逗号都表示"这个标签输完了"
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault() // 回车不要提交整个表单
      add(draft)
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value[value.length - 1]) // 输入框空着时按退格，删掉最后一个标签
    }
  }

  // 还没选的、并且和正在输入的内容沾边的用过的标签，最多显示 12 个
  const typed = normalizeTag(draft)
  const options = suggestions
    .filter((tag) => !value.includes(tag) && tag.includes(typed))
    .slice(0, 12)

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 focus-within:border-ring">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-0.5 rounded-full bg-gold/15 py-0.5 pr-1 pl-2 text-xs text-ink"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`去掉标签：${tag}`}
              className="rounded-full p-0.5 text-ink/50 hover:bg-ink/10 hover:text-ink"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => add(draft)} // 输完没按回车就点别处，也算加上
          placeholder={value.length === 0 ? '回车添加' : ''}
          className="h-6 min-w-24 flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
        />
      </div>

      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((tag) => (
            <button
              key={tag}
              type="button"
              // onMouseDown 里阻止默认行为：点这里时输入框不会失去焦点，
              // 否则会先触发上面的 onBlur，把没打完的字当成一个标签加进去
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(tag)}
              className="rounded-full border border-ink/15 px-2 py-0.5 text-xs text-ink/60 hover:border-gold hover:text-gold"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
