// 进度条 + 百分比。白板上的文件夹和项目详情里都用它。

export default function ProgressBar({ percent }: { percent: number }) {
  const finished = percent >= 100

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-1.5 flex-1 rounded-full bg-ink/10 ${finished ? 'bar-done' : ''}`}
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs text-ink/60 tabular-nums">
        {finished && <span className="star-pop mr-0.5 text-gold">✦</span>}
        {percent}%
      </span>
    </div>
  )
}
