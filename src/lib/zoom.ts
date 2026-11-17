// 看大图时的缩放和平移计算。纯函数，不碰界面，方便单独测试。
//
// 图片的显示方式：先按"刚好放进窗口"摆在正中间，再整体平移 (x, y)、放大 scale 倍。
// 下面所有坐标都以显示区域的正中心为原点，单位是屏幕像素。

export interface View {
  scale: number // 1 = 刚好放进窗口
  x: number // 平移
  y: number
}

export const MIN_SCALE = 1
export const MAX_SCALE = 8

export const FIT: View = { scale: 1, x: 0, y: 0 } // 刚好放进窗口、居中

// 以某个点为中心缩放到 nextScale 倍：缩放前后，这个点下面的图片内容保持不动。
// 用鼠标滚轮缩放时，这个点就是鼠标的位置，感觉像"往鼠标指的地方放大"。
export function zoomAt(view: View, nextScale: number, point: { x: number; y: number }): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
  if (scale === MIN_SCALE) return FIT // 缩回原大小时顺便回到正中间

  // 这个点到图片中心的距离，会跟着放大的倍数一起变长或变短
  const ratio = scale / view.scale
  return {
    scale,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  }
}
