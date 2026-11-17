// 项目详情里的"收藏库"：存这个项目的参考资料。
// 一条收藏可以只有文字、只有图片，或者几张图加一段说明。文字里的网址可以直接点开。

import { X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addReference, deleteReference, useReferences } from '@/db'
import { formatDateTime } from '@/lib/format'
import ImagePicker from './ImagePicker'
import Lightbox from './Lightbox'
import LinkifiedText from './LinkifiedText'

const MAX_IMAGES = 9 // 一条收藏最多几张图

interface Props {
  projectId: string
  readOnly: boolean
}

export default function ReferenceList({ projectId, readOnly }: Props) {
  const references = useReferences(projectId) // 最新的在最上面
  // 正在看大图：哪几张、从第几张开始
  const [viewing, setViewing] = useState<{ images: string[]; index: number } | null>(null)

  return (
    <section>
      <h3 className="mb-2 font-heading text-base font-semibold">收藏库</h3>

      {!readOnly && <ReferenceForm projectId={projectId} />}

      {references.length === 0 ? (
        <p className="py-2 text-sm text-ink/40">还没有收藏。</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {references.map((reference) => (
            <li
              key={reference.id}
              className="group grid gap-2 rounded-lg border border-ink/10 bg-white/70 p-2.5"
            >
              {reference.images.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {reference.images.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setViewing({ images: reference.images, index })}
                      aria-label={`看大图：第 ${index + 1} 张`}
                      className="aspect-square cursor-zoom-in overflow-hidden rounded bg-ink/5"
                    >
                      <img src={image} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {reference.text && (
                <p className="text-sm break-words whitespace-pre-wrap">
                  <LinkifiedText text={reference.text} />
                </p>
              )}

              <div className="flex items-center justify-between">
                <time className="text-xs text-ink/40 tabular-nums">
                  {formatDateTime(reference.createdAt)}
                </time>
                {!readOnly && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="opacity-30 transition-opacity group-hover:opacity-100"
                    onClick={() => deleteReference(reference.id)}
                    aria-label="删除这条收藏"
                  >
                    <X />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        images={viewing?.images ?? null}
        startIndex={viewing?.index}
        title="收藏"
        onClose={() => setViewing(null)}
      />
    </section>
  )
}

// 新增收藏的输入区：一段文字 + 图片
function ReferenceForm({ projectId }: { projectId: string }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false) // 图片还在压缩时先别让收藏

  // 文字和图片至少要有一样
  const canSubmit = (text.trim() !== '' || images.length > 0) && !busy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await addReference(projectId, { text: text.trim() || undefined, images })
    setText('')
    setImages([])
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <Textarea
        rows={2}
        placeholder="存一段文字、一个链接，或者配几张图…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <ImagePicker
        images={images}
        setImages={setImages}
        max={MAX_IMAGES}
        columns={4}
        onBusyChange={setBusy}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!canSubmit}>
          收藏
        </Button>
      </div>
    </form>
  )
}
