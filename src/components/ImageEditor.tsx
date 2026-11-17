// 图片编辑器：裁切、画笔、文字。
//
// 原理：把图片画到一块画布（canvas）上，之后的每一笔都直接画在这块画布上。
// 撤销靠的是"每次动手前先拍一张快照"，撤销就是换回上一张快照。
// 点"完成"时把画布导出成新图片；点"取消"则什么都不改。不保留原图。
//
// 裁切学的是 iPhone：一打开就有一个铺满整张图的框，拖四条边或四个角往里收，
// 拖框中间可以整体移动。点"完成"或换到别的工具时，自动按框裁切。

import { Crop, Pencil, RotateCcw, Type, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type CropHandle, dragCropRect, fullRect, isFullRect, type Rect, type Size } from '@/lib/crop'
import { canvasToJpeg } from '@/lib/image'

type Tool = 'crop' | 'pen' | 'text'

// 注意：下面的坐标都是"图片上的像素"，不是屏幕上的像素。
// 图片在屏幕上可能被缩小显示，换算见 toImagePoint()。
interface Point {
  x: number
  y: number
}

const TOOLS: { id: Tool; label: string; icon: React.ReactNode; hint: string }[] = [
  {
    id: 'crop',
    label: '裁切',
    icon: <Crop />,
    hint: '拖动边角调整裁切范围',
  },
  { id: 'pen', label: '画笔', icon: <Pencil />, hint: '按住拖动绘制' },
  { id: 'text', label: '文字', icon: <Type />, hint: '点击放置文字' },
]

const COLORS = [
  { value: '#e11d48', name: '红' },
  { value: '#c4975a', name: '金' },
  { value: '#ffffff', name: '白' },
  { value: '#1e293b', name: '黑' },
]

// 三档粗细 / 字号，按图片最长边的比例算，这样大图小图上看起来差不多
const SIZES = [
  { name: '小', pen: 0.004, text: 0.03 },
  { name: '中', pen: 0.008, text: 0.045 },
  { name: '大', pen: 0.016, text: 0.07 },
]

const MAX_UNDO = 20 // 最多能撤销多少步
const MIN_CROP_RATIO = 0.05 // 裁切框最小是图片最长边的 5%

// 裁切框上 8 个能拖的把手：放在哪、鼠标长什么样
const HANDLES: { id: CropHandle; className: string }[] = [
  // 四条边：沿着整条边的一窄条（两头留出给四个角）
  { id: 'n', className: 'top-0 inset-x-6 h-4 cursor-ns-resize' },
  { id: 's', className: 'bottom-0 inset-x-6 h-4 cursor-ns-resize' },
  { id: 'w', className: 'left-0 inset-y-6 w-4 cursor-ew-resize' },
  { id: 'e', className: 'right-0 inset-y-6 w-4 cursor-ew-resize' },
  // 四个角：粗一点的 L 形，和 iPhone 一样
  { id: 'nw', className: 'top-0 left-0 size-6 cursor-nwse-resize border-t-4 border-l-4' },
  { id: 'ne', className: 'top-0 right-0 size-6 cursor-nesw-resize border-t-4 border-r-4' },
  { id: 'sw', className: 'bottom-0 left-0 size-6 cursor-nesw-resize border-b-4 border-l-4' },
  { id: 'se', className: 'bottom-0 right-0 size-6 cursor-nwse-resize border-b-4 border-r-4' },
]

interface Props {
  image: string | null // 要编辑的图片；null 表示编辑器关闭
  onDone: (image: string) => void
  onClose: () => void
}

export default function ImageEditor({ image, onDone, onClose }: Props) {
  return (
    <Dialog open={image !== null} onOpenChange={(open) => !open && onClose()}>
      {image && <EditorBody image={image} onDone={onDone} onClose={onClose} />}
    </Dialog>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function EditorBody({
  image,
  onDone,
  onClose,
}: {
  image: string
  onDone: (image: string) => void
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const undoStack = useRef<ImageData[]>([]) // 快照，最后一张是最近一次的
  const penDrag = useRef<Point | null>(null) // 画笔正在画时，上一个点
  // 正在拖裁切框时：拖的是哪个部位、从哪开始、开始时框是什么样
  const cropDrag = useRef<{ handle: CropHandle; start: Point; rect: Rect } | null>(null)

  const [canvasSize, setCanvasSize] = useState<Size | null>(null) // null 表示图片还没加载好
  const [undoCount, setUndoCount] = useState(0)
  const [tool, setTool] = useState<Tool>('crop')
  const [color, setColor] = useState(COLORS[0].value)
  const [sizeIndex, setSizeIndex] = useState(1)
  const [cropRect, setCropRect] = useState<Rect | null>(null)
  const [textAt, setTextAt] = useState<Point | null>(null) // 正在输入的文字放在哪
  const [textValue, setTextValue] = useState('')

  // 把图片画到画布上（画布是浏览器里的东西，所以放在 effect 里）
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      const size = { width: canvas.width, height: canvas.height }
      setCanvasSize(size)
      setCropRect(fullRect(size))
    }
    img.src = image
  }, [image])

  function getCanvas() {
    const canvas = canvasRef.current!
    return { canvas, context: canvas.getContext('2d')! }
  }

  function longestSide(): number {
    const { canvas } = getCanvas()
    return Math.max(canvas.width, canvas.height)
  }

  // 屏幕上的鼠标位置 → 图片上的像素位置（不限制在图片范围内）
  function toImagePoint(e: React.PointerEvent): Point {
    const { canvas } = getCanvas()
    const box = canvas.getBoundingClientRect() // 画布在屏幕上实际显示的位置和大小
    return {
      x: ((e.clientX - box.left) / box.width) * canvas.width,
      y: ((e.clientY - box.top) / box.height) * canvas.height,
    }
  }

  // 同上，但限制在图片范围内（画笔和文字用）
  function toClampedImagePoint(e: React.PointerEvent): Point {
    const { canvas } = getCanvas()
    const point = toImagePoint(e)
    return { x: clamp(point.x, 0, canvas.width), y: clamp(point.y, 0, canvas.height) }
  }

  // 动手前拍一张快照，供撤销用
  function remember() {
    const { canvas, context } = getCanvas()
    undoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height))
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
    setUndoCount(undoStack.current.length)
  }

  // 用一张快照替换整块画布（尺寸也跟着变，裁切和撤销裁切都靠它）。
  // 换了图，裁切框也重新铺满。
  function replaceCanvas(data: ImageData) {
    const { canvas, context } = getCanvas()
    canvas.width = data.width
    canvas.height = data.height
    context.putImageData(data, 0, 0)
    const size = { width: data.width, height: data.height }
    setCanvasSize(size)
    setCropRect(fullRect(size))
  }

  function undo() {
    const previous = undoStack.current.pop()
    if (!previous) return
    replaceCanvas(previous)
    setUndoCount(undoStack.current.length)
    setTextAt(null)
    setTextValue('')
  }

  // ---------- 裁切 ----------

  // 框和整张图不一样，就按框裁切
  function applyCrop() {
    if (!cropRect || !canvasSize || isFullRect(cropRect, canvasSize)) return
    remember()
    const { context } = getCanvas()
    const kept = context.getImageData(
      Math.round(cropRect.x),
      Math.round(cropRect.y),
      Math.round(cropRect.width),
      Math.round(cropRect.height),
    )
    replaceCanvas(kept)
  }

  function resetCrop() {
    if (canvasSize) setCropRect(fullRect(canvasSize))
  }

  function handleCropPointerDown(handle: CropHandle, e: React.PointerEvent<HTMLDivElement>) {
    if (!cropRect || e.button !== 0) return
    e.stopPropagation() // 拖的是角或边，就不要再算成"拖框中间"
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId) // 拖出框外也继续收到事件
    cropDrag.current = { handle, start: toImagePoint(e), rect: cropRect }
  }

  // 挂在外层：被 capture 的元素收到的事件会一路往上冒泡到这里
  function handleCropPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = cropDrag.current
    if (!drag || !canvasSize) return
    const point = toImagePoint(e)
    const minSize = Math.max(canvasSize.width, canvasSize.height) * MIN_CROP_RATIO
    setCropRect(
      dragCropRect(drag.rect, drag.handle, point.x - drag.start.x, point.y - drag.start.y, canvasSize, minSize),
    )
  }

  function handleCropPointerUp() {
    cropDrag.current = null
  }

  // ---------- 画笔和文字 ----------

  function drawLine(from: Point, to: Point) {
    const { context } = getCanvas()
    context.strokeStyle = color
    context.lineWidth = Math.max(1, longestSide() * SIZES[sizeIndex].pen)
    context.lineCap = 'round' // 线头和拐角都是圆的，看起来像笔画
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.stroke()
  }

  // 把正在输入的文字真正画到图上；没写字就直接关掉输入框
  function commitText() {
    const text = textValue.trim()
    if (textAt && text !== '') {
      remember()
      const { context } = getCanvas()
      const fontSize = Math.round(longestSide() * SIZES[sizeIndex].text)
      context.font = `bold ${fontSize}px sans-serif`
      context.textBaseline = 'top'
      context.lineJoin = 'round'
      // 先描一圈对比色的边，再填字，这样放在什么背景上都看得清
      context.lineWidth = Math.max(2, fontSize * 0.15)
      context.strokeStyle = color === '#ffffff' ? '#1e293b' : '#ffffff'
      context.strokeText(text, textAt.x, textAt.y)
      context.fillStyle = color
      context.fillText(text, textAt.x, textAt.y)
    }
    setTextAt(null)
    setTextValue('')
  }

  // 画布上按下鼠标：只有画笔和文字会走到这里（裁切时上面盖着裁切框）
  function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canvasSize || e.button !== 0) return
    const point = toClampedImagePoint(e)

    if (tool === 'text') {
      // 阻止浏览器默认的"按下鼠标就转移焦点"，否则刚出现的输入框会立刻失去焦点，打字打不进去
      e.preventDefault()
      commitText() // 上一段文字先画上去
      setTextAt(point)
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    remember()
    drawLine(point, point) // 只点一下也留一个点
    penDrag.current = point
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!penDrag.current) return
    const point = toClampedImagePoint(e)
    drawLine(penDrag.current, point)
    penDrag.current = point
  }

  function handleCanvasPointerUp() {
    penDrag.current = null
  }

  // ---------- 切换工具、完成 ----------

  function switchTool(next: Tool) {
    if (next === tool) return
    commitText()
    if (tool === 'crop') applyCrop() // 离开裁切时，按框裁好
    setTool(next)
  }

  function handleDone() {
    commitText() // 还没按回车的文字也算上
    if (tool === 'crop') applyCrop()
    onDone(canvasToJpeg(getCanvas().canvas))
  }

  // 图片坐标 → 在显示区域里的百分比位置（用来摆裁切框和文字输入框）
  function percent(value: number, total: number): string {
    return `${(value / total) * 100}%`
  }

  const currentTool = TOOLS.find((t) => t.id === tool)!
  const cropChanged = cropRect !== null && canvasSize !== null && !isFullRect(cropRect, canvasSize)

  return (
    <DialogContent
      className="max-h-[95vh] overflow-y-auto text-ink sm:max-w-3xl"
      // 点到编辑器外面不要关掉，免得白画
      onInteractOutside={(e) => e.preventDefault()}
      // 正在输入文字时按 Esc，只取消这段文字，不关编辑器
      onEscapeKeyDown={(e) => {
        if (textAt) {
          e.preventDefault()
          setTextAt(null)
          setTextValue('')
        }
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-heading text-lg">编辑图片</DialogTitle>
        <DialogDescription className="sr-only">{currentTool.hint}</DialogDescription>
      </DialogHeader>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {TOOLS.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tool === t.id ? 'default' : 'outline'}
              onClick={() => switchTool(t.id)}
            >
              {t.icon}
              {t.label}
            </Button>
          ))}
        </div>

        {tool === 'crop' ? (
          <Button type="button" size="sm" variant="ghost" disabled={!cropChanged} onClick={resetCrop}>
            <RotateCcw />
            重置
          </Button>
        ) : (
          <>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={`${c.name}色`}
                  aria-pressed={color === c.value}
                  onClick={() => setColor(c.value)}
                  className={`size-6 rounded-full border border-ink/20 ${
                    color === c.value ? 'ring-2 ring-gold ring-offset-1' : ''
                  }`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              {SIZES.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  aria-pressed={sizeIndex === i}
                  onClick={() => setSizeIndex(i)}
                  className={`h-6 w-7 rounded border text-xs ${
                    sizeIndex === i
                      ? 'border-gold bg-gold text-white'
                      : 'border-ink/15 text-ink/60 hover:border-gold'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto"
          disabled={undoCount === 0}
          onClick={undo}
        >
          <Undo2 />
          撤销
        </Button>
      </div>

      {/* 画布区域。深色底，和 iPhone 一样，被裁掉的部分看起来更明显 */}
      <div className="flex justify-center rounded-lg bg-ink/80 p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            className={`block max-h-[60vh] max-w-full touch-none ${
              tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
            }`}
          />

          {/* 裁切框：盖在画布上面。框外变暗，框内有三等分的参考线 */}
          {tool === 'crop' && cropRect && canvasSize && (
            <div
              className="absolute inset-0 touch-none overflow-hidden"
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
            >
              <div
                className="absolute cursor-move border border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                style={{
                  left: percent(cropRect.x, canvasSize.width),
                  top: percent(cropRect.y, canvasSize.height),
                  width: percent(cropRect.width, canvasSize.width),
                  height: percent(cropRect.height, canvasSize.height),
                }}
                onPointerDown={(e) => handleCropPointerDown('move', e)}
              >
                {/* 三等分参考线 */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-y-0 left-1/3 border-l border-white/40" />
                  <div className="absolute inset-y-0 left-2/3 border-l border-white/40" />
                  <div className="absolute inset-x-0 top-1/3 border-t border-white/40" />
                  <div className="absolute inset-x-0 top-2/3 border-t border-white/40" />
                </div>

                {HANDLES.map((h) => (
                  <div
                    key={h.id}
                    data-handle={h.id}
                    className={`absolute border-white ${h.className}`}
                    onPointerDown={(e) => handleCropPointerDown(h.id, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 文字输入框：出现在点击的位置，按回车后文字才画到图上 */}
          {textAt && canvasSize && (
            <input
              autoFocus
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitText()
                }
              }}
              placeholder="输入文字"
              aria-label="要放在图上的文字"
              className="absolute z-10 w-44 rounded border border-gold bg-white/90 px-1.5 py-0.5 text-sm text-ink outline-none"
              style={{
                left: percent(textAt.x, canvasSize.width),
                top: percent(textAt.y, canvasSize.height),
              }}
            />
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          取消
        </Button>
        <Button type="button" onClick={handleDone} disabled={!canvasSize}>
          完成
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
