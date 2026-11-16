import { expect, test } from 'vitest'
import { calcProgress } from './progress'

test('没填预估、也没有事项时是 0%', () => {
  expect(calcProgress(undefined, []).percent).toBe(0)
})

test('没填预估时，分母是事项总分', () => {
  const p = calcProgress(undefined, [
    { score: 3, done: true },
    { score: 1, done: false },
  ])
  expect(p.denominator).toBe(4)
  expect(p.percent).toBe(75)
  expect(p.overBy).toBe(0)
})

test('预估比事项总分大时，分母是预估', () => {
  const p = calcProgress(10, [{ score: 5, done: true }])
  expect(p.denominator).toBe(10)
  expect(p.percent).toBe(50)
  expect(p.overBy).toBe(0)
})

test('事项总分超过预估时，分母是事项总分，并标出超出多少', () => {
  const p = calcProgress(5, [
    { score: 5, done: true },
    { score: 3, done: false },
  ])
  expect(p.denominator).toBe(8)
  expect(p.percent).toBe(63)
  expect(p.overBy).toBe(3)
})

test('全部完成且没超出预估时是 100%', () => {
  const p = calcProgress(4, [
    { score: 2, done: true },
    { score: 2, done: true },
  ])
  expect(p.percent).toBe(100)
})
