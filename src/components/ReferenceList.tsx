// 项目详情里的"Ref 库"：存这个项目的参考资料。
// 一条 Ref 可以只有文字、只有图片，或者几张图加一段说明。文字里的网址可以直接点开。
// 每条都可以编辑：在卡片原地改文字、删图、加图、裁切或标记。

import { Pencil, X } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addReference, deleteReference, markReferenceViewed, updateReference, useReferences } from '@/db'
import { formatDateTime } from '@/lib/format'
import type { Reference } from '@/types'
import DeleteConfirmation from './DeleteConfirmation'
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

  return (
    <section>
      <h3 className="mb-2 font-heading text-base font-semibold">Ref 库</h3>

      {/* 编辑某一条时，Ctrl+V 粘贴的图片进正在编辑的那条，不进上面的新增框 */}
      {!readOnly && <ReferenceForm projectId={projectId} pasteEnabled={editingId === null} />}

      {references.length === 0 ? (
        <p className="py-2 text-sm text-ink/40">暂无 Ref</p>
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
                onEdit={readOnly ? undefined : () => setEditingId(reference.id)}
              />
            ),
          )}
        </ul>
      )}
    </section>
  )
}

// 平时显示的一条 Ref
export function ReferenceCard({
  reference,
  onEdit,
  source,
}: {
  reference: Reference
  onEdit?: () => void
  source?: React.ReactNode
}) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)
  const viewed = reference.viewed === true

  return (
    <li className="group grid gap-2 rounded-lg border border-ink/10 bg-white/70 p-2.5">
      {reference.images.length > 0 && (
        // @xl: / @3xl:：面板（容器）够宽时一行多放几张
        <div className="grid grid-cols-4 gap-1.5 @xl:grid-cols-6 @3xl:grid-cols-8">
          {reference.images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setViewingIndex(index)}
              aria-label={`看大图：第 ${index + 1} 张`}
              className="aspect-square cursor-zoom-in overflow-hidden rounded bg-ink/5"
            >
              <img src={image} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {reference.text && <ReferenceText text={reference.text} />}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <time className="text-xs text-ink/40 tabular-nums">{formatDateTime(reference.createdAt)}</time>
        {source}
        <Button
          type="button"
          size="xs"
          variant={viewed ? 'ghost' : 'outline'}
          className="ml-auto"
          disabled={viewed}
          onClick={() => markReferenceViewed(reference.id)}
        >
          {viewed ? '已查看' : '标为已查看'}
        </Button>
        {onEdit && (
          // 编辑和删除按钮平时是淡的，鼠标移到这条上才明显
          <div className="flex opacity-30 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <Button size="icon-xs" variant="ghost" onClick={onEdit} aria-label="编辑这条 Ref">
              <Pencil />
            </Button>
            <DeleteConfirmation
              title="删除这条 Ref？"
              description={reference.text || undefined}
              onConfirm={() => deleteReference(reference.id)}
            >
              <Button type="button" size="icon-xs" variant="ghost" aria-label="删除这条 Ref">
                <X />
              </Button>
            </DeleteConfirmation>
          </div>
        )}
      </div>
      <Lightbox
        images={viewingIndex === null ? null : reference.images}
        startIndex={viewingIndex ?? undefined}
        title="Ref"
        onClose={() => setViewingIndex(null)}
      />
    </li>
  )
}

function ReferenceText({ text }: { text: string }) {
  const textId = useId()
  const textRef = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [hasMoreLines, setHasMoreLines] = useState(false)

  useLayoutEffect(() => {
    const paragraph = textRef.current
    if (!paragraph) return

    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(paragraph).lineHeight)
      setHasMoreLines(paragraph.scrollHeight > Math.ceil(4 * lineHeight))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(paragraph)
    document.fonts.addEventListener('loadingdone', measure)
    return () => {
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', measure)
    }
  }, [text])

  return (
    <div className="min-w-0">
      <p
        id={textId}
        ref={textRef}
        className={`text-sm break-words whitespace-pre-wrap ${expanded ? '' : 'line-clamp-4'}`}
      >
        <LinkifiedText text={text} />
      </p>
      {hasMoreLines && (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="mt-1"
          aria-controls={textId}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="text-[#8a5a2b]">{expanded ? '收起' : '展开全文'}</span>
        </Button>
      )}
    </div>
  )
}

// 新增和编辑共用的输入区：一段文字 + 图片。
// 传了 reference 就是编辑它；没传就是新增。
export function ReferenceForm({
  projectId,
  reference,
  onDone,
  pasteEnabled = true,
}: {
  projectId: string | null
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
      {/* 紧凑样子：左边小小的"添加图片"方块，右边是输入框 */}
      <ImagePicker
        images={images}
        setImages={setImages}
        max={MAX_IMAGES}
        compact
        onBusyChange={setBusy}
        pasteEnabled={pasteEnabled}
        // 按钮放在"从剪贴板粘贴"那一行的右边，省一行
        actions={
          <>
            {reference && (
              <Button type="button" size="sm" variant="ghost" onClick={onDone}>
                取消
              </Button>
            )}
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {reference ? '保存' : '存入'}
            </Button>
          </>
        }
      >
        <Textarea
          rows={2}
          autoFocus={reference !== undefined}
          placeholder="文字或链接"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </ImagePicker>
    </form>
  )
}
