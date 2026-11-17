// 看大图：铺满整个窗口。
// - 切换：左右箭头、键盘左右键、下面的小图
// - 放大缩小：鼠标滚轮（往鼠标指的地方放大）、右上角的 − / + 按钮、键盘 + / −
// - 放大后按住拖动可以移动；双击放大，再双击还原；点百分比或按 0 也能还原
// - 关闭：Esc 或右上角 ×

import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FIT, MAX_SCALE, type View, zoomAt } from '@/lib/zoom'

const BUTTON_STEP = 1.25 // 点一下 + / − 放大缩小多少倍
const DOUBLE_CLICK_SCALE = 2.5 // 双击放大到几倍

interface Props {
  images: string[] | null // 要看的图片；null 表示关闭
  title: string
  startIndex?: number // 从第几张开始看（从 0 数），默认第一张
  onClose: () => void
}

export default function Lightbox({ images, title, startIndex = 0, onClose }: Props) {
  return (
    <Dialog open={images !== null} onOpenChange={(open) => !open && onClose()}>
      {/* 内容单独做成组件：每次打开都是全新的，从 startIndex 那张开始 */}
      {images && <LightboxBody images={images} title={title} startIndex={startIndex} />}
    </Dialog>
  )
}

function LightboxBody({
  images,
  title,
  startIndex,
}: {
  images: string[]
  title: string
  startIndex: number
}) {
  const [index, setIndex] = useState(startIndex)
  const [view, setView] = useState<View>(FIT) // 当前的缩放和平移
  const [dragging, setDragging] = useState(false)
  const stage = useRef<HTMLDivElement>(null) // 显示图片的区域
  // 正在拖动时：按下时鼠标在哪、图片当时平移到哪
  const drag = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null)

  const hasMany = images.length > 1
  const zoomed = view.scale > 1

  // 换一张图时，缩放还原
  function show(next: number) {
    setIndex(next)
    setView(FIT)
  }

  // 首尾相接：最后一张再往后就回到第一张
  function go(step: number) {
    show((index + step + images.length) % images.length)
  }

  // 屏幕上的位置 → 以显示区域正中心为原点的坐标
  function fromCenter(clientX: number, clientY: number) {
    const box = stage.current!.getBoundingClientRect()
    return { x: clientX - (box.left + box.width / 2), y: clientY - (box.top + box.height / 2) }
  }

  // 放大或缩小 factor 倍；不给 point 就以正中心为准
  function zoomBy(factor: number, point = { x: 0, y: 0 }) {
    setView((current) => zoomAt(current, current.scale * factor, point))
  }

  function handleWheel(e: React.WheelEvent) {
    // 往前滚放大，往后滚缩小；滚得越多变化越大
    zoomBy(Math.exp(-e.deltaY * 0.002), fromCenter(e.clientX, e.clientY))
  }

  function handleDoubleClick(e: React.MouseEvent) {
    setView(zoomed ? FIT : zoomAt(FIT, DOUBLE_CLICK_SCALE, fromCenter(e.clientX, e.clientY)))
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!zoomed || e.button !== 0) return // 没放大时不用拖
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { pointerX: e.clientX, pointerY: e.clientY, x: view.x, y: view.y }
    setDragging(true)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start) return
    setView((current) => ({
      ...current,
      x: start.x + e.clientX - start.pointerX,
      y: start.y + e.clientY - start.pointerY,
    }))
  }

  function handlePointerUp() {
    drag.current = null
    setDragging(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft' && hasMany) go(-1)
    else if (e.key === 'ArrowRight' && hasMany) go(1)
    else if (e.key === '+' || e.key === '=') zoomBy(BUTTON_STEP)
    else if (e.key === '-') zoomBy(1 / BUTTON_STEP)
    else if (e.key === '0') setView(FIT)
  }

  return (
    <DialogContent
      showCloseButton={false}
      // 盖住整个窗口：去掉默认的居中、宽度上限、圆角和内边距
      className="inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-black/95 p-0 text-white ring-0 sm:max-w-none"
      onKeyDown={handleKeyDown}
    >
      {/* 顶栏：标题、第几张、缩放按钮、关闭 */}
      <header className="flex items-center gap-3 px-4 py-2">
        <DialogTitle className="min-w-0 flex-1 truncate font-heading text-base font-semibold">
          {title}
        </DialogTitle>
        <DialogDescription className="sr-only">查看大图，可以放大缩小和左右切换</DialogDescription>

        {hasMany && (
          <span className="text-sm text-white/70 tabular-nums">
            {index + 1} / {images.length}
          </span>
        )}

        <div className="flex items-center gap-1">
          <ToolbarButton label="缩小" onClick={() => zoomBy(1 / BUTTON_STEP)} disabled={!zoomed}>
            <Minus className="size-4" />
          </ToolbarButton>
          <button
            type="button"
            onClick={() => setView(FIT)}
            title="还原"
            aria-label="还原到刚好放进窗口"
            className="w-14 rounded px-1 py-1 text-center text-xs text-white/80 tabular-nums hover:bg-white/10"
          >
            {Math.round(view.scale * 100)}%
          </button>
          <ToolbarButton label="放大" onClick={() => zoomBy(BUTTON_STEP)} disabled={view.scale >= MAX_SCALE}>
            <Plus className="size-4" />
          </ToolbarButton>
        </div>

        <DialogClose asChild>
          <ToolbarButton label="关闭">
            <X className="size-5" />
          </ToolbarButton>
        </DialogClose>
      </header>

      {/* 显示图片的区域 */}
      <div
        ref={stage}
        className={`relative min-h-0 flex-1 touch-none overflow-hidden select-none ${
          zoomed ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          src={images[index]}
          alt={`${title} 第 ${index + 1} 张`}
          draggable={false} // 不要浏览器自带的"拖图片"
          // absolute + inset-0 + m-auto：在区域里居中，并且不超出区域
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transition: dragging ? 'none' : 'transform 0.12s ease-out', // 拖动时要跟手，不加动画
          }}
        />

        {hasMany && (
          <>
            <ArrowButton side="left" onClick={() => go(-1)} />
            <ArrowButton side="right" onClick={() => go(1)} />
          </>
        )}
      </div>

      {/* 下面一排小图，点哪张看哪张 */}
      {hasMany && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
          {images.map((image, i) => (
            <button
              key={i}
              type="button"
              onClick={() => show(i)}
              aria-label={`看第 ${i + 1} 张`}
              aria-current={i === index}
              className={`size-14 shrink-0 overflow-hidden rounded border-2 transition-opacity ${
                i === index ? 'border-gold' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <img src={image} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </DialogContent>
  )
}

// 顶栏上的小圆按钮。其余属性（包括 onClick、ref）原样交给 <button>，
// 所以它也能放进 DialogClose asChild 里，由 DialogClose 给它加上"点了就关闭"。
function ToolbarButton({
  label,
  children,
  ...props
}: React.ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  )
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // 点箭头时不要算成"在图片上按下"（否则放大后点箭头会开始拖动）、也不要触发双击放大
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label={side === 'left' ? '上一张' : '下一张'}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 ${
        side === 'left' ? 'left-4' : 'right-4'
      }`}
    >
      {side === 'left' ? <ChevronLeft className="size-6" /> : <ChevronRight className="size-6" />}
    </button>
  )
}
