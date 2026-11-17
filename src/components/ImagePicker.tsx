// 选图片：从文件夹选（可多选）、Ctrl+V 粘贴、"从剪贴板粘贴"按钮；
// 每张图可以裁切/标记、删除，需要时还能设为封面。图片都会先压缩再放进来。
//
// 两种样子：
// - 普通（成就用）：图片排成三列大方块，最后一格是"添加图片"
// - 紧凑（Ref 库用）：左边一个小小的"添加"方块，右边放外面传进来的内容（比如输入框），
//   已加的图片在下面排成一行小缩略图

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
  compact?: boolean // 用紧凑的样子
  children?: React.ReactNode // 紧凑时放在"添加"方块右边的内容
  actions?: React.ReactNode // 放在"从剪贴板粘贴"那一行最右边的东西，比如保存按钮
  onBusyChange?: (busy: boolean) => void // 正在压缩图片时告诉外面，外面可以先别让保存
  // 要不要接收 Ctrl+V。页面上同时有两个选图网格时，只让一个接收，免得一张图被加两次
  pasteEnabled?: boolean
}

export default function ImagePicker({
  images,
  setImages,
  max,
  showCover = false,
  compact = false,
  children,
  actions,
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
      messages.push(`最多 ${max} 张，已忽略 ${files.length - room} 张。`)
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

    if (failed > 0) messages.push(`${failed} 张图片无法读取。`)
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
        setError('剪贴板中没有图片。')
        return
      }
      addImageFiles(blobs)
    } catch {
      setError('无法读取剪贴板，请使用 Ctrl+V。')
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

  // 一张已选图片的小方块，右下角有裁切/标记、设为封面、删除按钮。sizeClass 决定它多大
  function renderThumb(image: string, index: number, sizeClass: string) {
    return (
      <div key={index} className={`relative overflow-hidden rounded-lg bg-ink/5 ${sizeClass}`}>
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
    )
  }

  // "添加图片"按钮：点了打开选择文件
  const addButton = (className: string, content: React.ReactNode) => (
    <button
      type="button"
      onClick={() => fileInput.current?.click()}
      disabled={busy}
      aria-label="添加图片"
      title="添加图片"
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink/15 text-xs text-ink/50 hover:border-gold hover:text-gold disabled:opacity-50 ${className}`}
    >
      {content}
    </button>
  )

  return (
    <div className="grid gap-1.5">
      {compact ? (
        <>
          {/* 紧凑：左边小方块 + 右边外面传进来的内容 */}
          <div className="flex items-start gap-2">
            {hasRoom &&
              addButton(
                'size-16 shrink-0', // 和输入框一样高（输入框最矮 64px，size-16 也是 64px）
                busy ? (
                  <span className="text-[10px]">处理中</span>
                ) : (
                  <ImagePlus className="size-5" />
                ),
              )}
            <div className="min-w-0 flex-1">{children}</div>
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((image, index) => renderThumb(image, index, 'size-20'))}
            </div>
          )}
        </>
      ) : (
        /* 普通：图片排成三列方块，最后一格是"添加" */
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => renderThumb(image, index, 'aspect-square'))}

          {hasRoom &&
            addButton(
              'aspect-square',
              <>
                <ImagePlus className="size-5" />
                {busy ? '处理中…' : '添加图片'}
              </>,
            )}
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImagesChosen}
      />

      {/* 一行：左边是粘贴的入口，右边是外面传进来的按钮（比如"存入"） */}
      {(hasRoom || actions) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/50">
          {hasRoom && (
            <>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={pasteFromClipboard}
                disabled={busy}
                title="粘贴图片（Ctrl+V）"
              >
                <ClipboardPaste />
                粘贴
              </Button>
            </>
          )}
          {actions && <div className="ml-auto flex gap-1">{actions}</div>}
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
