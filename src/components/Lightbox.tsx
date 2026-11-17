// 看大图：一次显示一张，左右切换；下面一排小图，点哪张看哪张。
// 键盘左右键也能切换。

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

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
  const hasMany = images.length > 1

  // 首尾相接：最后一张再往后就回到第一张
  function go(step: number) {
    setIndex((current) => (current + step + images.length) % images.length)
  }

  return (
    <DialogContent
      className="gap-3 border-0 bg-ink p-4 text-white sm:max-w-4xl"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1)
        if (e.key === 'ArrowRight') go(1)
      }}
    >
      <DialogTitle className="pr-8 font-heading text-base font-semibold">{title}</DialogTitle>
      <DialogDescription className="sr-only">查看大图，左右切换</DialogDescription>

      <div className="relative flex items-center justify-center">
        <img
          src={images[index]}
          alt={`${title} 第 ${index + 1} 张`}
          className="max-h-[70vh] max-w-full rounded object-contain"
        />

        {hasMany && (
          <>
            <ArrowButton side="left" onClick={() => go(-1)} />
            <ArrowButton side="right" onClick={() => go(1)} />
          </>
        )}
      </div>

      {hasMany && (
        <div className="flex items-center justify-center gap-2">
          {images.map((image, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`看第 ${i + 1} 张`}
              aria-current={i === index}
              className={`size-12 overflow-hidden rounded border-2 transition-opacity ${
                i === index ? 'border-gold' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <img src={image} alt="" className="size-full object-cover" />
            </button>
          ))}
          <span className="ml-2 text-xs text-white/60 tabular-nums">
            {index + 1} / {images.length}
          </span>
        </div>
      )}
    </DialogContent>
  )
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? '上一张' : '下一张'}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
    >
      {side === 'left' ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
    </button>
  )
}
