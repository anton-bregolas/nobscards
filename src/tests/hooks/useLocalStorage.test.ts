import { describe, it, expect, beforeEach } from 'vitest'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { act, renderHook } from '@testing-library/react'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns initial value when key does not exist', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    const [value] = result.current
    expect(value).toBe('default')
  })

  it('reads existing value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    const [value] = result.current
    expect(value).toBe('stored')
  })

  it('returns initial value on JSON parse error', () => {
    localStorage.setItem('test-key', 'not-valid-json')
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))
    const [value] = result.current
    expect(value).toBe('fallback')
  })

  it('sets value and persists to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    act(() => {
      const [, setValue] = result.current
      setValue('updated')
    })
    const [value] = result.current
    expect(value).toBe('updated')
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe('updated')
  })

  it('setValue with updater function', () => {
    const { result } = renderHook(() => useLocalStorage<number>('counter', 0))
    act(() => {
      const [, setValue] = result.current
      setValue((prev) => prev + 1)
    })
    const [value] = result.current
    expect(value).toBe(1)
  })
})
