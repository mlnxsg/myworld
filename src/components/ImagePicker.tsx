// 选图片的小方块网格：从文件夹选（可多选）、Ctrl+V 粘贴、"从剪贴板粘贴"按钮；
// 每张图可以裁切/标记、删除，需要时还能设为封面。
// 成就和收藏库都用它。图片都会先压缩再放进来。

import { ClipboardPaste, ImagePlus, SquarePen, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { compressImage } from '@/lib/image'
import ImageEditor from './ImageEditor'

interface Props {
  images: string[]
  // 直接传 useState 的 set 函数进来，这样可以用"在原来的基础上改"的写法
  setImages: React.Dispatch<React.SetStateAction<string[]>>
  max: number // 最多几张
  showCover?: boolean // 第一张标成"封面"，其他张可以"设为封面"
  columns?: 3 | 4
  onBusyChange?: (busy: boolean) => void // 正在压缩图片时告诉外面，外面可以先别让保存
  // 要不要接收 Ctrl+V。页面上同时有两个选图网格时，只让一个接收，免得一张图被加两次
  pasteEnabled?: boolean
}

export default function ImagePicker({
  images,
  setImages,
  max,
  showCover = false,
  columns = 3,
  onBusyChange,
  pasteEnabled = true,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null) // 正在裁切/标记第几张
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null) // 藏起来的"选择文件"输入框

  function updateBusy(next: boolean) {
    setBusy(next)
    onBusyChange?.(next)
  }

  // 加图片：逐张压缩，加到最后面。从文件夹选、Ctrl+V、"从剪贴板粘贴"按钮都走这里。
  async function addImageFiles(files: Blob[]) {
    if (files.length === 0 || busy) return

    const room = max - images.length // 还能放几张
    const messages: string[] = []
    if (files.length > room) {
      messages.push(`最多 ${max} 张，多出的 ${files.length - room} 张没有加进来。`)
    }

    updateBusy(true)
    const added: string[] = []
    let failed = 0
    for (const file of files.slice(0, room)) {
      try {
        added.push(await compressImage(file))
      } catch {
        failed++
      }
    }
    updateBusy(false)

    if (failed > 0) messages.push(`有 ${failed} 张图片打不开，没有加进来。`)
    setImages((current) => [...current, ...added])
    setError(messages.join(''))
  }

  // 从文件夹选好图片后（可以一次选多张）
  function handleImagesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = '' // 清掉，这样下次选同样的图也会触发
    addImageFiles(files)
  }

  // Ctrl+V：这个网格在页面上时，在哪里按都行。
  // 剪贴板里是图片才接手；是文字就照常粘贴到输入框里，不受影响。
  // 监听整个页面的"粘贴"属于和浏览器打交道，所以放在 effect 里，组件消失时要取消监听。
  // 不写依赖列表：每次渲染后都重新挂一次，这样处理函数里用到的 images 等总是最新的。
  useEffect(() => {
    if (!pasteEnabled) return
    function handlePaste(e: ClipboardEvent) {
      if (editingIndex !== null) return // 正在裁切/标记某张图时不加新图
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) return
      e.preventDefault()
      addImageFiles(files)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  })

  // "从剪贴板粘贴"按钮：主动去读剪贴板。第一次用时浏览器可能会问要不要允许。
  async function pasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read()
      const blobs: Blob[] = []
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'))
        if (imageType) blobs.push(await item.getType(imageType))
      }
      if (blobs.length === 0) {
        setError('剪贴板里没有图片。先截图或复制一张图片再试。')
        return
      }
      addImageFiles(blobs)
    } catch {
      setError('浏览器没有允许读取剪贴板。可以直接按 Ctrl+V 粘贴。')
    }
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index))
    setError('')
  }

  // 把某一张挪到第一位，当封面
  function makeCover(index: number) {
    setImages((current) => [current[index], ...current.filter((_, i) => i !== index)])
  }

  const hasRoom = images.length < max

  return (
    <div className="grid gap-1.5">
      {/* 已选的图片排成小方块；最后一格是"添加" */}
      {/* columns 是最少几列；放在够宽的面板里（外面有 @container）会自动多排几列 */}
      <div
        className={`grid gap-2 ${
          columns === 4 ? 'grid-cols-4 @xl:grid-cols-6 @3xl:grid-cols-8' : 'grid-cols-3'
        }`}
      >
        {images.map((image, index) => (
          <div key={index} className="relative aspect-square overflow-hidden rounded-lg bg-ink/5">
            <img src={image} alt={`第 ${index + 1} 张`} className="size-full object-cover" />

            {showCover && index === 0 && (
              <span className="absolute top-1 left-1 rounded bg-gold px-1.5 text-[10px] text-white">
                封面
              </span>
            )}

            {/* 每张图上的小按钮：裁切/标记、设为封面、删除 */}
            <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1">
              <Button
                type="button"
                size="icon-xs"
                variant="secondary"
                onClick={() => setEditingIndex(index)}
                aria-label={`裁切或标记第 ${index + 1} 张`}
                title="裁切 / 标记"
              >
                <SquarePen />
              </Button>
              {showCover && index > 0 && (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  onClick={() => makeCover(index)}
                  aria-label={`把第 ${index + 1} 张设为封面`}
                  title="设为封面"
                >
                  <Star />
                </Button>
              )}
              <Button
                type="button"
                size="icon-xs"
                variant="secondary"
                onClick={() => removeImage(index)}
                aria-label={`删除第 ${index + 1} 张`}
                title="删除这张"
              >
                <X />
              </Button>
            </div>
          </div>
        ))}

        {hasRoom && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink/15 text-xs text-ink/50 hover:border-gold hover:text-gold disabled:opacity-50"
          >
            <ImagePlus className="size-5" />
            {busy ? '处理中…' : '添加图片'}
          </button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImagesChosen}
      />

      {hasRoom && (
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink/50">
          <Button type="button" size="xs" variant="outline" onClick={pasteFromClipboard} disabled={busy}>
            <ClipboardPaste />
            从剪贴板粘贴
          </Button>
          <span>或者直接按 Ctrl+V 粘贴截图、复制的图片</span>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <ImageEditor
        image={editingIndex !== null ? images[editingIndex] : null}
        onDone={(edited) => {
          // 只替换正在编辑的那一张
          setImages((current) => current.map((image, i) => (i === editingIndex ? edited : image)))
          setEditingIndex(null)
        }}
        onClose={() => setEditingIndex(null)}
      />
    </div>
  )
}
