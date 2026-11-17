import { expect, test } from 'vitest'
import { splitLinks } from './linkify'

// 只取出其中的链接，方便断言
function links(text: string) {
  return splitLinks(text)
    .filter((part) => part.href)
    .map((part) => ({ text: part.text, href: part.href }))
}

test('www 开头的网址能识别，点的时候补上 https://', () => {
  expect(links('www.baidu.com')).toEqual([{ text: 'www.baidu.com', href: 'https://www.baidu.com' }])
})

test('没有 www 的常见域名也能识别，路径也算进去', () => {
  expect(links('看这个 github.com/xyjoey/PRISM 不错')).toEqual([
    { text: 'github.com/xyjoey/PRISM', href: 'https://github.com/xyjoey/PRISM' },
  ])
  expect(links('baidu.com')).toEqual([{ text: 'baidu.com', href: 'https://baidu.com' }])
})

test('带 http(s):// 的照常识别，原样作为地址', () => {
  expect(links('http://localhost:5173/a?b=1')).toEqual([
    { text: 'http://localhost:5173/a?b=1', href: 'http://localhost:5173/a?b=1' },
  ])
})

test('网址遇到中文标点、空格就结束', () => {
  expect(links('https://example.com/docs。nice')[0].text).toBe('https://example.com/docs')
  expect(links('（www.qq.com）')[0].text).toBe('www.qq.com')
})

test('网址末尾的英文句号、逗号不算进去', () => {
  expect(links('see https://a.com.')[0].text).toBe('https://a.com')
  expect(links('try baidu.com, ok')[0].text).toBe('baidu.com')
})

test('不是网址的不要误认：邮箱、版本号、文件名、普通文字', () => {
  expect(links('我的邮箱 me@qq.com')).toEqual([])
  expect(links('版本 1.5 已发布')).toEqual([])
  expect(links('打开 notes.txt')).toEqual([])
  expect(links('哈喽哈喽')).toEqual([])
})

test('切开后再拼回去，和原文一模一样（一个字都不丢）', () => {
  const text = '先看 www.baidu.com，再看 https://a.com/x。最后 github.com 结束'
  expect(
    splitLinks(text)
      .map((part) => part.text)
      .join(''),
  ).toBe(text)
})
