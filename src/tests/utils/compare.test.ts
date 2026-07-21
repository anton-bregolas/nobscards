import { describe, it, expect } from 'vitest'
import { similarity, bestMatch } from '../../utils/compare'

describe('similarity', () => {
  it('returns 100 for identical strings', () => {
    expect(similarity('hello', 'hello')).toBe(100)
  })

  it('returns 100 after normalization', () => {
    expect(similarity('Hello!', 'hello')).toBe(100)
  })

  it('handles Russian ё normalization', () => {
    expect(similarity('ёлка', 'елка')).toBe(100)
  })

  it('handles Serbian diacritics', () => {
    expect(similarity('š', 's')).toBe(100)
    expect(similarity('č', 'c')).toBe(100)
    expect(similarity('đ', 'd')).toBe(100)
    expect(similarity('ž', 'z')).toBe(100)
  })

  it('handles punctuation stripping', () => {
    expect(similarity('hello, world!', 'hello world')).toBe(100)
  })

  it('handles whitespace normalization', () => {
    expect(similarity('hello   world', 'hello world')).toBe(100)
  })

  it('returns lower score for different strings', () => {
    const result = similarity('hello', 'hallo')
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(100)
  })

  it('returns 100 when both strings are empty', () => {
    expect(similarity('', '')).toBe(100)
  })

  it('returns 0 for completely different strings', () => {
    const result = similarity('abc', 'xyz')
    expect(result).toBe(0)
  })
})

describe('bestMatch', () => {
  it('finds exact match', () => {
    const result = bestMatch('hello', ['world', 'hello', 'foo'])
    expect(result.match).toBe('hello')
    expect(result.percent).toBe(100)
  })

  it('finds best partial match', () => {
    const result = bestMatch('hel', ['world', 'hello', 'foo'])
    expect(result.match).toBe('hello')
    expect(result.percent).toBeGreaterThan(0)
  })

  it('returns first target with 0 percent for no match', () => {
    const result = bestMatch('xyz', ['hello', 'world'])
    expect(result.percent).toBe(0)
  })

  it('handles empty targets', () => {
    const result = bestMatch('hello', [])
    expect(result.match).toBe('')
    expect(result.percent).toBe(0)
  })
})
