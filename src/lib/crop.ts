// 裁切框的计算。纯函数，不碰界面，方便单独测试。
// 所有数字都是"图片上的像素"。

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// 拖的是裁切框的哪个部位：四条边（上下左右）、四个角，或者框中间（整体移动）
export type CropHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move'

export interface Size {
  width: number
  height: number
}

// 铺满整张图的裁切框
export function fullRect(size: Size): Rect {
  return { x: 0, y: 0, width: size.width, height: size.height }
}

// 裁切框是不是就是整张图（也就是"什么都没裁"）
export function isFullRect(rect: Rect, size: Size): boolean {
  return (
    Math.round(rect.x) === 0 &&
    Math.round(rect.y) === 0 &&
    Math.round(rect.width) === size.width &&
    Math.round(rect.height) === size.height
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// 按住某个部位拖动了 (dx, dy) 之后，裁切框变成什么样。
// - start：开始拖动时的裁切框
// - bounds：整张图的大小，框不能超出图片
// - minSize：框最小不能小于这么多像素
export function dragCropRect(
  start: Rect,
  handle: CropHandle,
  dx: number,
  dy: number,
  bounds: Size,
  minSize: number,
): Rect {
  let left = start.x
  let top = start.y
  let right = start.x + start.width
  let bottom = start.y + start.height

  if (handle === 'move') {
    // 整体移动：大小不变，只是不能移出图片
    const moveX = clamp(dx, -left, bounds.width - right)
    const moveY = clamp(dy, -top, bounds.height - bottom)
    return { ...start, x: left + moveX, y: top + moveY }
  }

  // 拖边或角：只动被拖的那几条边，另一侧不动
  if (handle.includes('w')) left = clamp(left + dx, 0, right - minSize)
  if (handle.includes('e')) right = clamp(right + dx, left + minSize, bounds.width)
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - minSize)
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + minSize, bounds.height)

  return { x: left, y: top, width: right - left, height: bottom - top }
}
