// 项目详情里的"Ref库"：存这个项目的参考资料。
// 一条 Ref 可以只有文字、只有图片，或者几张图加一段说明。文字里的网址可以直接点开。
// 每条都可以编辑：在卡片原地改文字、删图、加图、裁切或标记。

import { Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addReference, deleteReference, updateReference, useReferences } from '@/db'
import { formatDateTime } from '@/lib/format'
import type { Reference } from '@/types'
import ImagePicker from './ImagePicker'
import Lightbox from './Lightbox'
import LinkifiedText from './LinkifiedText'

const MAX_IMAGES = 9 // 一条 Ref 最多几张图

interface Props {
  projectId: string
  readOnly: boolean
}

export default function ReferenceList({ projectId, readOnly }: Props) {
  const references = useReferences(projectId) // 最新的在最上面
  // 正在编辑哪一条（一次只能编辑一条）；null 表示没有在编辑
  const [editingId, setEditingId] = useState<string | null>(null)
  // 正在看大图：哪几张、从第几张开始
  const [viewing, setViewing] = useState<{ images: string[]; index: number } | null>(null)

  return (
    <section>
      <h3 className="mb-2 font-heading text-base font-semibold">Ref库</h3>

      {/* 编辑某一条时，Ctrl+V 粘贴的图片进正在编辑的那条，不进上面的新增框 */}
      {!readOnly && <ReferenceForm projectId={projectId} pasteEnabled={editingId === null} />}

      {references.length === 0 ? (
        <p className="py-2 text-sm text-ink/40">还没有 Ref。</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {references.map((reference) =>
            reference.id === editingId ? (
              <li key={reference.id} className="rounded-lg border border-gold/60 bg-white p-2.5">
                <ReferenceForm
                  projectId={projectId}
                  reference={reference}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <ReferenceCard
                key={reference.id}
                reference={reference}
                readOnly={readOnly}
                onView={(index) => setViewing({ images: reference.images, index })}
                onEdit={() => setEditingId(reference.id)}
              />
            ),
          )}
        </ul>
      )}

      <Lightbox
        images={viewing?.images ?? null}
        startIndex={viewing?.index}
        title="Ref"
        onClose={() => setViewing(null)}
      />
    </section>
  )
}

// 平时显示的一条 Ref
function ReferenceCard({
  reference,
  readOnly,
  onView,
  onEdit,
}: {
  reference: Reference
  readOnly: boolean
  onView: (index: number) => void
  onEdit: () => void
}) {
  return (
    <li className="group grid gap-2 rounded-lg border border-ink/10 bg-white/70 p-2.5">
      {reference.images.length > 0 && (
        // @xl: / @3xl:：面板（容器）够宽时一行多放几张
        <div className="grid grid-cols-4 gap-1.5 @xl:grid-cols-6 @3xl:grid-cols-8">
          {reference.images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onView(index)}
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
        <time className="text-xs text-ink/40 tabular-nums">{formatDateTime(reference.createdAt)}</time>
        {!readOnly && (
          // 编辑和删除按钮平时是淡的，鼠标移到这条上才明显
          <div className="flex opacity-30 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <Button size="icon-xs" variant="ghost" onClick={onEdit} aria-label="编辑这条 Ref">
              <Pencil />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => deleteReference(reference.id)}
              aria-label="删除这条 Ref"
            >
              <X />
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}

// 新增和编辑共用的输入区：一段文字 + 图片。
// 传了 reference 就是编辑它；没传就是新增。
function ReferenceForm({
  projectId,
  reference,
  onDone,
  pasteEnabled = true,
}: {
  projectId: string
  reference?: Reference
  onDone?: () => void // 编辑时：保存或取消之后要做的事（比如回到平时的样子）
  pasteEnabled?: boolean
}) {
  const [text, setText] = useState(reference?.text ?? '')
  const [images, setImages] = useState<string[]>(reference?.images ?? [])
  const [busy, setBusy] = useState(false) // 图片还在压缩时先别让保存

  // 文字和图片至少要有一样
  const canSubmit = (text.trim() !== '' || images.length > 0) && !busy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const input = { text: text.trim() || undefined, images }

    if (reference) {
      await updateReference(reference.id, input)
      onDone?.()
    } else {
      await addReference(projectId, input)
      setText('')
      setImages([])
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <Textarea
        rows={2}
        autoFocus={reference !== undefined}
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
        pasteEnabled={pasteEnabled}
      />
      <div className="flex justify-end gap-1">
        {reference && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            取消
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {reference ? '保存' : '存入'}
        </Button>
      </div>
    </form>
  )
}
