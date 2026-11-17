// 图片编辑器：裁切、画笔、文字。
//
// 原理：把图片画到一块画布（canvas）上，之后的每一笔都直接画在这块画布上。
// 撤销靠的是"每次动手前先拍一张快照"，撤销就是换回上一张快照。
// 点"完成"时把画布导出成新图片；点"取消"则什么都不改。不保留原图。

import { Check, Crop, Pencil, Type, Undo2 } from 'lucide-react'
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
import { canvasToJpeg } from '@/lib/image'

type Tool = 'pen' | 'text' | 'crop'

// 注意：下面的坐标都是"图片上的像素"，不是屏幕上的像素。
// 图片在屏幕上可能被缩小显示，换算见 toImagePoint()。
interface Point {
  x: number
  y: number
}
interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const TOOLS: { id: Tool; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'pen', label: '画笔', icon: <Pencil />, hint: '在图上按住拖动来画。' },
  { id: 'text', label: '文字', icon: <Type />, hint: '在图上点一下放文字，输入后按回车。' },
  { id: 'crop', label: '裁切', icon: <Crop />, hint: '在图上拖出要保留的区域，再点"应用裁切"。' },
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
const MIN_CROP = 10 // 裁切框小于这么多像素就当作没拖

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

// 两个点围成的矩形（不管从哪个方向拖都对）
function rectBetween(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
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
  const drag = useRef<{ start: Point; last: Point } | null>(null) // 正在拖动时的起点和上一个点

  // 画布的尺寸。null 表示图片还没加载好。
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const [undoCount, setUndoCount] = useState(0)
  const [tool, setTool] = useState<Tool>('pen')
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
      setCanvasSize({ width: canvas.width, height: canvas.height })
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

  // 屏幕上的鼠标位置 → 图片上的像素位置
  function toImagePoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = e.currentTarget
    const box = canvas.getBoundingClientRect() // 画布在屏幕上实际显示的位置和大小
    return {
      x: clamp(((e.clientX - box.left) / box.width) * canvas.width, 0, canvas.width),
      y: clamp(((e.clientY - box.top) / box.height) * canvas.height, 0, canvas.height),
    }
  }

  // 动手前拍一张快照，供撤销用
  function remember() {
    const { canvas, context } = getCanvas()
    undoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height))
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
    setUndoCount(undoStack.current.length)
  }

  // 用一张快照替换整块画布（尺寸也跟着变，裁切和撤销裁切都靠它）
  function replaceCanvas(data: ImageData) {
    const { canvas, context } = getCanvas()
    canvas.width = data.width
    canvas.height = data.height
    context.putImageData(data, 0, 0)
    setCanvasSize({ width: data.width, height: data.height })
  }

  function undo() {
    const previous = undoStack.current.pop()
    if (!previous) return
    replaceCanvas(previous)
    setUndoCount(undoStack.current.length)
    setCropRect(null)
    setTextAt(null)
    setTextValue('')
  }

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

  function switchTool(next: Tool) {
    commitText()
    setCropRect(null)
    setTool(next)
  }

  function applyCrop() {
    if (!cropRect) return
    remember()
    const { context } = getCanvas()
    const kept = context.getImageData(
      Math.round(cropRect.x),
      Math.round(cropRect.y),
      Math.round(cropRect.width),
      Math.round(cropRect.height),
    )
    replaceCanvas(kept)
    setCropRect(null)
  }

  function handleDone() {
    commitText() // 还没按回车的文字也算上
    onDone(canvasToJpeg(getCanvas().canvas))
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canvasSize || e.button !== 0) return
    const point = toImagePoint(e)

    if (tool === 'text') {
      // 阻止浏览器默认的"按下鼠标就转移焦点"，否则刚出现的输入框会立刻失去焦点，打字打不进去
      e.preventDefault()
      commitText() // 上一段文字先画上去
      setTextAt(point)
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId) // 拖出画布也继续收到事件
    drag.current = { start: point, last: point }

    if (tool === 'crop') {
      setCropRect({ ...point, width: 0, height: 0 })
    } else {
      remember()
      drawLine(point, point) // 只点一下也留一个点
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drag.current) return
    const point = toImagePoint(e)
    if (tool === 'crop') {
      setCropRect(rectBetween(drag.current.start, point))
    } else {
      drawLine(drag.current.last, point)
      drag.current.last = point
    }
  }

  function handlePointerUp() {
    drag.current = null
    if (tool === 'crop' && cropRect && (cropRect.width < MIN_CROP || cropRect.height < MIN_CROP)) {
      setCropRect(null)
    }
  }

  // 图片坐标 → 在显示区域里的百分比位置（用来摆裁切框和文字输入框）
  function percent(value: number, total: number): string {
    return `${(value / total) * 100}%`
  }

  const currentTool = TOOLS.find((t) => t.id === tool)!

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
        <DialogDescription>{currentTool.hint}</DialogDescription>
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
          <Button type="button" size="sm" disabled={!cropRect} onClick={applyCrop}>
            <Check />
            应用裁切
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

      {/* 画布区域 */}
      <div className="flex justify-center rounded-lg bg-ink/5 p-2">
        <div className="relative">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`block max-h-[60vh] max-w-full touch-none ${
              tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
            }`}
          />

          {/* 裁切框：框外面变暗。外层 overflow-hidden 把那圈超大阴影裁掉 */}
          {cropRect && canvasSize && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute border-2 border-dashed border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{
                  left: percent(cropRect.x, canvasSize.width),
                  top: percent(cropRect.y, canvasSize.height),
                  width: percent(cropRect.width, canvasSize.width),
                  height: percent(cropRect.height, canvasSize.height),
                }}
              />
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
              placeholder="输入文字，回车确定"
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
