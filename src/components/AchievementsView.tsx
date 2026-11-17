// 成就区：记下自己比较满意的事，每条配一张或几张图，可以加几个标签。
// 顶部可以按标签筛选。

import { ImagePlus, Images, Pencil, Plus, SquarePen, Star, X } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { addAchievement, deleteAchievement, updateAchievement, useAchievements } from '@/db'
import { formatDate } from '@/lib/format'
import { compressImage } from '@/lib/image'
import type { Achievement } from '@/types'

const MAX_IMAGES = 9 // 一条成就最多几张图
import ImageEditor from './ImageEditor'
import Lightbox from './Lightbox'
import TagInput from './TagInput'

export default function AchievementsView() {
  const achievements = useAchievements()
  // 正在编辑哪一条：'new' 表示新增，null 表示弹窗关闭
  const [editing, setEditing] = useState<Achievement | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Achievement | null>(null)
  const [filter, setFilter] = useState<string | null>(null) // 正在按哪个标签筛选
  const [viewing, setViewing] = useState<Achievement | null>(null) // 正在看哪一条的大图

  // 数一数每个标签用了几次，用得多的排前面
  const tagCounts = new Map<string, number>()
  for (const achievement of achievements) {
    for (const tag of achievement.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  }
  const allTags = [...tagCounts.keys()].sort(
    (a, b) => tagCounts.get(b)! - tagCounts.get(a)! || a.localeCompare(b, 'zh-CN'),
  )

  // 如果筛选的标签已经没有了（比如带它的最后一条被删了），就当作"全部"
  const activeFilter = filter !== null && tagCounts.has(filter) ? filter : null
  const shown = activeFilter
    ? achievements.filter((a) => a.tags?.includes(activeFilter))
    : achievements

  // 再点一次正在筛选的标签 = 取消筛选
  function toggleFilter(tag: string) {
    setFilter(activeFilter === tag ? null : tag)
  }

  async function handleConfirmDelete() {
    if (!deleting) return
    await deleteAchievement(deleting.id)
    setDeleting(null)
  }

  return (
    <div className="h-full overflow-auto bg-paper">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold">成就</h2>
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus />
            记一条
          </Button>
        </div>

        {/* 标签筛选 */}
        {allTags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            <FilterChip active={activeFilter === null} onClick={() => setFilter(null)}>
              全部 {achievements.length}
            </FilterChip>
            {allTags.map((tag) => (
              <FilterChip key={tag} active={activeFilter === tag} onClick={() => toggleFilter(tag)}>
                {tag} {tagCounts.get(tag)}
              </FilterChip>
            ))}
          </div>
        )}

        {achievements.length === 0 && (
          <p className="font-heading text-ink/40">
            还没有记录。做得不错的菜、解决的难题、坚持下来的事，都值得记一笔。
          </p>
        )}

        {/* columns-*：像报纸一样分栏，高矮不一的卡片会自然错落排开 */}
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {shown.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              activeFilter={activeFilter}
              onTagClick={toggleFilter}
              onView={() => setViewing(achievement)}
              onEdit={() => setEditing(achievement)}
              onDelete={() => setDeleting(achievement)}
            />
          ))}
        </div>
      </div>

      <Lightbox
        images={viewing ? viewing.images : null}
        title={viewing?.title ?? ''}
        onClose={() => setViewing(null)}
      />

      <AchievementDialog editing={editing} allTags={allTags} onClose={() => setEditing(null)} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{deleting?.title}」？</AlertDialogTitle>
            <AlertDialogDescription>这条成就和它的图片会一起删除，无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// 顶部筛选用的小圆角按钮
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-0.5 text-xs tabular-nums transition-colors ${
        active
          ? 'border-gold bg-gold text-white'
          : 'border-ink/15 text-ink/60 hover:border-gold hover:text-gold'
      }`}
    >
      {children}
    </button>
  )
}

function AchievementCard({
  achievement,
  activeFilter,
  onTagClick,
  onView,
  onEdit,
  onDelete,
}: {
  achievement: Achievement
  activeFilter: string | null
  onTagClick: (tag: string) => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const tags = achievement.tags ?? []
  const images = achievement.images ?? []

  return (
    // break-inside-avoid：分栏时不要把一张卡片从中间切开
    <article className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border border-folder-edge bg-white">
      {/* 只显示第一张作封面；点它打开大图看全部 */}
      {images.length > 0 && (
        <button
          type="button"
          onClick={onView}
          aria-label={`看大图：${achievement.title}`}
          className="relative block w-full cursor-zoom-in"
        >
          <img src={images[0]} alt={achievement.title} className="block w-full" />
          {images.length > 1 && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white tabular-nums">
              <Images className="size-3" />共 {images.length} 张
            </span>
          )}
        </button>
      )}

      <div className="p-4">
        <h3 className="font-heading text-base font-semibold">
          <span className="mr-1 text-gold">✦</span>
          {achievement.title}
        </h3>
        {achievement.content && (
          <p className="mt-1 text-sm whitespace-pre-wrap text-ink/80">{achievement.content}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <time className="text-xs text-ink/40 tabular-nums">{formatDate(achievement.createdAt)}</time>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className={`text-xs hover:underline ${
                tag === activeFilter ? 'font-medium text-gold' : 'text-gold/80'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* 编辑和删除按钮平时看不见，鼠标移到卡片上才出现 */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <Button size="icon-xs" variant="secondary" onClick={onEdit} aria-label={`编辑成就：${achievement.title}`}>
          <Pencil />
        </Button>
        <Button size="icon-xs" variant="secondary" onClick={onDelete} aria-label={`删除成就：${achievement.title}`}>
          <X />
        </Button>
      </div>
    </article>
  )
}

function AchievementDialog({
  editing,
  allTags,
  onClose,
}: {
  editing: Achievement | 'new' | null
  allTags: string[]
  onClose: () => void
}) {
  const isNew = editing === 'new'

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto text-ink sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{isNew ? '记一条成就' : '编辑成就'}</DialogTitle>
          <DialogDescription>标题和至少一张图片必填；文字、标签选填。</DialogDescription>
        </DialogHeader>
        {/* 表单单独做成组件：每次打开都会重新创建，里面的输入框就是这条成就当前的内容 */}
        {editing !== null && (
          <AchievementForm
            achievement={isNew ? undefined : editing}
            allTags={allTags}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AchievementForm({
  achievement,
  allTags,
  onClose,
}: {
  achievement?: Achievement // 没有就是新增
  allTags: string[]
  onClose: () => void
}) {
  const [title, setTitle] = useState(achievement?.title ?? '')
  const [content, setContent] = useState(achievement?.content ?? '')
  const [images, setImages] = useState<string[]>(achievement?.images ?? []) // 压缩（和编辑）后的图片
  const [tags, setTags] = useState<string[]>(achievement?.tags ?? [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null) // 正在裁切/标记第几张
  const [loadingImages, setLoadingImages] = useState(false)
  const [error, setError] = useState('')
  // 藏起来的"选择文件"输入框
  const fileInput = useRef<HTMLInputElement>(null)

  // 选好图片后（可以一次选多张）：逐张压缩，加到最后面
  async function handleImagesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = '' // 清掉，这样下次选同样的图也会触发
    if (files.length === 0) return

    const room = MAX_IMAGES - images.length // 还能放几张
    const messages: string[] = []
    if (files.length > room) {
      messages.push(`最多 ${MAX_IMAGES} 张，多出的 ${files.length - room} 张没有加进来。`)
    }

    setLoadingImages(true)
    const added: string[] = []
    let failed = 0
    for (const file of files.slice(0, room)) {
      try {
        added.push(await compressImage(file))
      } catch {
        failed++
      }
    }
    setLoadingImages(false)

    if (failed > 0) messages.push(`有 ${failed} 张图片打不开，没有加进来。`)
    setImages((current) => [...current, ...added])
    setError(messages.join(''))
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index))
    setError('')
  }

  // 把某一张挪到第一位，当封面
  function makeCover(index: number) {
    setImages((current) => [current[index], ...current.filter((_, i) => i !== index)])
  }

  // 标题和至少一张图片都有了才能保存
  const canSubmit = title.trim() !== '' && images.length > 0 && !loadingImages

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const input = { title: title.trim(), content: content.trim() || undefined, images, tags }
    if (achievement) {
      await updateAchievement(achievement.id, input)
    } else {
      await addAchievement(input)
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="achievement-title">标题</Label>
        <Input
          id="achievement-title"
          autoFocus
          placeholder="比如：第一次做成功的红烧肉"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="achievement-content">文字（选填）</Label>
        <Textarea
          id="achievement-content"
          rows={3}
          placeholder="怎么做到的？哪里让我满意？"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label>
          图片
          <span className="font-normal text-ink/40 tabular-nums">
            {images.length} / {MAX_IMAGES}，第一张是封面
          </span>
        </Label>

        {/* 已选的图片排成三列小方块；最后一格是"添加" */}
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <div key={index} className="relative aspect-square overflow-hidden rounded-lg bg-ink/5">
              <img src={image} alt={`第 ${index + 1} 张`} className="size-full object-cover" />

              {index === 0 && (
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
                {index > 0 && (
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

          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={loadingImages}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink/15 text-xs text-ink/50 hover:border-gold hover:text-gold disabled:opacity-50"
            >
              <ImagePlus className="size-5" />
              {loadingImages ? '处理中…' : '添加图片'}
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
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="achievement-tags">标签（选填）</Label>
        <TagInput id="achievement-tags" value={tags} onChange={setTags} suggestions={allTags} />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {achievement ? '保存' : '记下'}
        </Button>
      </DialogFooter>

      <ImageEditor
        image={editingIndex !== null ? images[editingIndex] : null}
        onDone={(edited) => {
          // 只替换正在编辑的那一张
          setImages((current) => current.map((image, i) => (i === editingIndex ? edited : image)))
          setEditingIndex(null)
        }}
        onClose={() => setEditingIndex(null)}
      />
    </form>
  )
}
