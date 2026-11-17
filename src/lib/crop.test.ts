import { expect, test } from 'vitest'
import { dragCropRect, fullRect, isFullRect } from './crop'

const image = { width: 1000, height: 600 }
const full = fullRect(image)

test('一开始的裁切框铺满整张图', () => {
  expect(full).toEqual({ x: 0, y: 0, width: 1000, height: 600 })
  expect(isFullRect(full, image)).toBe(true)
})

test('往里拖上边：只有上边动，下边不动', () => {
  const r = dragCropRect(full, 'n', 0, 100, image, 40)
  expect(r).toEqual({ x: 0, y: 100, width: 1000, height: 500 })
  expect(isFullRect(r, image)).toBe(false)
})

test('拖右下角：右边和下边一起往里收', () => {
  const r = dragCropRect(full, 'se', -200, -100, image, 40)
  expect(r).toEqual({ x: 0, y: 0, width: 800, height: 500 })
})

test('边不能拖出图片外面', () => {
  const r = dragCropRect(full, 'w', -50, 0, image, 40)
  expect(r.x).toBe(0)
  expect(r.width).toBe(1000)
})

test('框不能被压得比最小尺寸还小，也不能翻过去', () => {
  const r = dragCropRect(full, 'e', -5000, 0, image, 40)
  expect(r.width).toBe(40)
  expect(r.x).toBe(0)
})

test('拖框中间：整体移动，大小不变，也不能移出图片', () => {
  const small = { x: 100, y: 100, width: 300, height: 200 }
  expect(dragCropRect(small, 'move', 50, 20, image, 40)).toEqual({ x: 150, y: 120, width: 300, height: 200 })
  // 往右下拖太多，会停在图片边上
  expect(dragCropRect(small, 'move', 5000, 5000, image, 40)).toEqual({
    x: 700,
    y: 400,
    width: 300,
    height: 200,
  })
})
