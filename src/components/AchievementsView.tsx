// 成就区：记下自己比较满意的事，每条配一张或几张图，可以加几个标签。
// 顶部可以按标签筛选。

import { Images, Pencil, Plus, X } from 'lucide-react'
import { useState } from 'react'
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
import type { Achievement } from '@/types'

const MAX_IMAGES = 9 // 一条成就最多几张图
import ImagePicker from './ImagePicker'
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
            新增
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

        {achievements.length === 0 && <p className="font-heading text-ink/40">暂无记录</p>}

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
            <AlertDialogDescription>图片将一并删除，且无法恢复。</AlertDialogDescription>
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
          <time className="text-xs text-ink/40 tabular-nums">
            {formatDate(achievement.createdAt)}
          </time>
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
        <Button
          size="icon-xs"
          variant="secondary"
          onClick={onEdit}
          aria-label={`编辑成就：${achievement.title}`}
        >
          <Pencil />
        </Button>
        <Button
          size="icon-xs"
          variant="secondary"
          onClick={onDelete}
          aria-label={`删除成就：${achievement.title}`}
        >
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
          <DialogTitle className="font-heading text-lg">
            {isNew ? '新成就' : '编辑成就'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            填写成就的标题、图片、描述和标签
          </DialogDescription>
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
  const [loadingImages, setLoadingImages] = useState(false) // 图片还在压缩时先别让保存

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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="achievement-content">描述</Label>
        <Textarea
          id="achievement-content"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label>
          图片
          <span className="font-normal text-ink/40 tabular-nums">
            {images.length} / {MAX_IMAGES}
          </span>
        </Label>

        <ImagePicker
          images={images}
          setImages={setImages}
          max={MAX_IMAGES}
          showCover
          onBusyChange={setLoadingImages}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="achievement-tags">标签</Label>
        <TagInput id="achievement-tags" value={tags} onChange={setTags} suggestions={allTags} />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          保存
        </Button>
      </DialogFooter>
    </form>
  )
}
