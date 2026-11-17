import { expect, test } from 'vitest'
import { FIT, MAX_SCALE, zoomAt } from './zoom'

// 屏幕上某个点，对应的是图片上的哪个位置（以图片中心为原点、按原大小算）
function imagePointUnder(view: { scale: number; x: number; y: number }, screen: { x: number; y: number }) {
  return { x: (screen.x - view.x) / view.scale, y: (screen.y - view.y) / view.scale }
}

test('以正中心放大：只变大，不平移', () => {
  expect(zoomAt(FIT, 2, { x: 0, y: 0 })).toEqual({ scale: 2, x: 0, y: 0 })
})

test('以鼠标位置放大：鼠标下面的图片内容不动', () => {
  const mouse = { x: 100, y: -50 }
  const before = imagePointUnder(FIT, mouse)
  const zoomed = zoomAt(FIT, 3, mouse)
  expect(imagePointUnder(zoomed, mouse)).toEqual(before)
})

test('连续放大再缩小，鼠标下的内容也一直不动', () => {
  const mouse = { x: -80, y: 40 }
  const before = imagePointUnder(FIT, mouse)
  const view = zoomAt(zoomAt(FIT, 4, mouse), 2, mouse)
  const after = imagePointUnder(view, mouse)
  expect(after.x).toBeCloseTo(before.x)
  expect(after.y).toBeCloseTo(before.y)
})

test('不能放得比上限还大', () => {
  expect(zoomAt(FIT, 100, { x: 0, y: 0 }).scale).toBe(MAX_SCALE)
})

test('缩到原大小或更小时，回到刚好放进窗口、居中', () => {
  const zoomed = zoomAt(FIT, 3, { x: 200, y: 100 })
  expect(zoomAt(zoomed, 0.5, { x: 0, y: 0 })).toEqual(FIT)
})
