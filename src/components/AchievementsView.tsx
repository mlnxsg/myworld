// 成就区：记下自己比较满意的事，每条配一张图，可以加几个标签。
// 顶部可以按标签筛选。

import { ImagePlus, Pencil, Plus, SquarePen, X } from 'lucide-react'
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
import ImageEditor from './ImageEditor'
import TagInput from './TagInput'

export default function AchievementsView() {
  const achievements = useAchievements()
  // 正在编辑哪一条：'new' 表示新增，null 表示弹窗关闭
  const [editing, setEditing] = useState<Achievement | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Achievement | null>(null)
  const [filter, setFilter] = useState<string | null>(null) // 正在按哪个标签筛选

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
              onEdit={() => setEditing(achievement)}
              onDelete={() => setDeleting(achievement)}
            />
          ))}
        </div>
      </div>

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
  onEdit,
  onDelete,
}: {
  achievement: Achievement
  activeFilter: string | null
  onTagClick: (tag: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const tags = achievement.tags ?? []

  return (
    // break-inside-avoid：分栏时不要把一张卡片从中间切开
    <article className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border border-folder-edge bg-white">
      {achievement.image && (
        <img src={achievement.image} alt={achievement.title} className="block w-full" />
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
          <DialogDescription>标题和图片必填；文字、标签选填。</DialogDescription>
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
  const [image, setImage] = useState(achievement?.image) // 压缩（和编辑）后的图片
  const [tags, setTags] = useState<string[]>(achievement?.tags ?? [])
  const [editingImage, setEditingImage] = useState(false)
  const [error, setError] = useState('')
  // 藏起来的"选择文件"输入框，"选择图片"和"换一张"都用它
  const fileInput = useRef<HTMLInputElement>(null)

  async function handleImageChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // 清掉，这样下次选同一张图也会触发
    if (!file) return

    try {
      setImage(await compressImage(file))
      setError('')
    } catch {
      setError('这张图片打不开，换一张试试。')
    }
  }

  // 标题和图片都有了才能保存
  const canSubmit = title.trim() !== '' && image !== undefined

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const input = { title: title.trim(), content: content.trim() || undefined, image, tags }
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
        <Label>图片</Label>
        {image ? (
          <div className="grid gap-2">
            <img src={image} alt="预览" className="max-h-56 w-full rounded-lg bg-ink/5 object-contain" />
            <div className="flex flex-wrap gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingImage(true)}>
                <SquarePen />
                裁切 / 标记
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
                换一张
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus />
            选择图片
          </Button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChosen}
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
        image={editingImage ? (image ?? null) : null}
        onDone={(edited) => {
          setImage(edited)
          setEditingImage(false)
        }}
        onClose={() => setEditingImage(false)}
      />
    </form>
  )
}
