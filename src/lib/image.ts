// 把用户选的图片缩小并压缩，变成一段可以直接存进数据库的文字（data URL）。
//
// 为什么要压缩：手机拍的照片一张常有几 MB。图片是和其他数据一起存、一起备份的，
// 不压缩的话备份文件很快会变得非常大。缩到最长边 1280 像素后，一张通常只有 100–300 KB，
// 在屏幕上看仍然清楚。

const MAX_SIDE = 1280 // 最长的一边不超过这么多像素
const QUALITY = 0.82 // JPEG 质量，0–1，越大越清楚也越占空间

// 参数是 Blob（一段二进制数据）：从文件夹选的 File 和从剪贴板读到的图片都属于 Blob
export async function compressImage(file: Blob): Promise<string> {
  // 把文件解码成浏览器能画的图
  const bitmap = await createImageBitmap(file)

  // 按比例缩小；本来就不大的图保持原样（scale 最大是 1）
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  // 画到一块看不见的画布上，再让画布导出成 JPEG
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff' // 透明的 PNG 转成 JPEG 时，透明处用白色填
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return canvasToJpeg(canvas)
}

// 把画布上的内容导出成 JPEG 的 data URL。图片编辑器"完成"时也用它。
export function canvasToJpeg(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', QUALITY)
}
