// 成就区：记下自己比较满意的事，可以配一张图，也可以只写文字。

import { Plus, X } from 'lucide-react'
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
import { addAchievement, deleteAchievement, useAchievements } from '@/db'
import { formatDate } from '@/lib/format'
import { compressImage } from '@/lib/image'
import type { Achievement } from '@/types'

export default function AchievementsView() {
  const achievements = useAchievements()
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Achievement | null>(null)

  async function handleConfirmDelete() {
    if (!deleting) return
    await deleteAchievement(deleting.id)
    setDeleting(null)
  }

  return (
    <div className="h-full overflow-auto bg-paper">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold">成就</h2>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus />
            记一条
          </Button>
        </div>

        {achievements.length === 0 && (
          <p className="font-heading text-ink/40">
            还没有记录。做得不错的菜、解决的难题、坚持下来的事，都值得记一笔。
          </p>
        )}

        {/* columns-*：像报纸一样分栏，高矮不一的卡片会自然错落排开 */}
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {achievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onDelete={() => setDeleting(achievement)}
            />
          ))}
        </div>
      </div>

      <NewAchievementDialog open={adding} onClose={() => setAdding(false)} />

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

function AchievementCard({
  achievement,
  onDelete,
}: {
  achievement: Achievement
  onDelete: () => void
}) {
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
        <time className="mt-2 block text-xs text-ink/40 tabular-nums">
          {formatDate(achievement.createdAt)}
        </time>
      </div>

      {/* 删除按钮平时看不见，鼠标移到卡片上才出现 */}
      <Button
        size="icon-xs"
        variant="secondary"
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={onDelete}
        aria-label={`删除成就：${achievement.title}`}
      >
        <X />
      </Button>
    </article>
  )
}

function NewAchievementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="text-ink sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">记一条成就</DialogTitle>
          <DialogDescription>标题必填；文字和图片都是选填，可以只要其中一样。</DialogDescription>
        </DialogHeader>
        {/* 表单单独做成组件：弹窗每次打开都会重新创建它，输入框自然就清空了 */}
        {open && <NewAchievementForm onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function NewAchievementForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState<string | undefined>(undefined) // 压缩后的图片
  const [error, setError] = useState('')

  // 选好图片后：压缩，并显示预览
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim() === '') return
    await addAchievement({
      title: title.trim(),
      content: content.trim() || undefined,
      image,
    })
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
        <Label htmlFor="achievement-image">图片（选填）</Label>
        {image ? (
          <div className="relative">
            <img src={image} alt="预览" className="max-h-56 w-full rounded-lg object-contain" />
            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => setImage(undefined)}
              aria-label="去掉这张图片"
            >
              <X />
            </Button>
          </div>
        ) : (
          <Input id="achievement-image" type="file" accept="image/*" onChange={handleImageChosen} />
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={title.trim() === ''}>
          记下
        </Button>
      </DialogFooter>
    </form>
  )
}
