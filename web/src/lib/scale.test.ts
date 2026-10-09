import { describe, expect, it } from 'vitest'
import { linear, niceTicks } from './scale'

describe('scale', () => {
  it('maps domain ends to range ends', () => {
    const s = linear(0, 10, 100, 0)
    expect(s(0)).toBe(100)
    expect(s(10)).toBe(0)
    expect(s(5)).toBe(50)
  })
  it('picks 1-2-5 steps that cover the domain', () => {
    expect(niceTicks(0, 100, 4)).toEqual([0, 50, 100])
    expect(niceTicks(-20, 160, 4)).toEqual([0, 50, 100, 150])
  })
})
