import { describe, expect, it, vi } from 'vitest'
import { decisionFileName, downloadDecision, readDecisionFile } from './decisionFile'
import { exportDecision } from '../domain/serialization'
import type { Decision } from '../domain/types'

function sample(overrides: Partial<Decision> = {}): Decision {
  return {
    id: 'd',
    title: 'Which EV should I buy?',
    factors: [{ id: 'c', name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } }],
    alternatives: [{ id: 'm3', name: 'Model 3', ratings: { c: 45 } }],
    ...overrides,
  }
}

describe('decisionFileName', () => {
  it('slugifies the title', () => {
    expect(decisionFileName(sample({ title: 'Which EV should I buy?' }))).toBe(
      'which-ev-should-i-buy.json',
    )
  })

  it('falls back to "decision" for a blank or symbol-only title', () => {
    expect(decisionFileName(sample({ title: '' }))).toBe('decision.json')
    expect(decisionFileName(sample({ title: '   ' }))).toBe('decision.json')
    expect(decisionFileName(sample({ title: '!!!' }))).toBe('decision.json')
  })

  it('trims leading/trailing separators', () => {
    expect(decisionFileName(sample({ title: '  Hello World  ' }))).toBe('hello-world.json')
  })
})

describe('downloadDecision', () => {
  it('creates an anchor with the right download name and clicks it', () => {
    // jsdom lacks URL.createObjectURL / revokeObjectURL — stub them.
    const createURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock')
    const revokeURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const click = vi.fn()
    const realCreate = document.createElement.bind(document)
    const createEl = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLElement
      if (tag === 'a') el.click = click
      return el
    })

    downloadDecision(sample())

    expect(createURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeURL).toHaveBeenCalledWith('blob:mock')

    createEl.mockRestore()
    createURL.mockRestore()
    revokeURL.mockRestore()
  })
})

describe('readDecisionFile', () => {
  it('parses a valid exported decision file back into a decision', async () => {
    const decision = sample()
    const file = new File([exportDecision(decision)], 'd.json', { type: 'application/json' })
    await expect(readDecisionFile(file)).resolves.toEqual(decision)
  })

  it('rejects a malformed file with an ImportError', async () => {
    const file = new File(['not json {'], 'bad.json', { type: 'application/json' })
    await expect(readDecisionFile(file)).rejects.toThrow(/not valid JSON/i)
  })
})
