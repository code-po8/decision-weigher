import { describe, expect, it } from 'vitest'
import { scoreToTen, scoreToPercent } from './format'

describe('scoreToTen', () => {
  it('scales a 0..1 score onto 0–10 with one decimal', () => {
    expect(scoreToTen(0)).toBe('0.0')
    expect(scoreToTen(1)).toBe('10.0')
    expect(scoreToTen(0.732)).toBe('7.3')
    expect(scoreToTen(0.75)).toBe('7.5')
  })
})

describe('scoreToPercent', () => {
  it('formats a 0..1 score as a rounded percentage', () => {
    expect(scoreToPercent(0)).toBe('0%')
    expect(scoreToPercent(1)).toBe('100%')
    expect(scoreToPercent(0.732)).toBe('73%')
    expect(scoreToPercent(0.735)).toBe('74%')
  })
})
