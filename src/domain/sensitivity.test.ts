import { describe, expect, it } from 'vitest'
import { analyzeSensitivity, mostInfluentialFactor } from './sensitivity'
import type { Decision, Factor, Alternative } from './types'

function factor(id: string, weight: number, over: Partial<Factor> = {}): Factor {
  return {
    id,
    name: over.name ?? id,
    weight,
    direction: over.direction ?? 'higher-is-better',
    scale: over.scale ?? { kind: '0-10' },
  }
}

function alt(id: string, ratings: Record<string, number>): Alternative {
  return { id, name: id, ratings }
}

function decision(factors: Factor[], alternatives: Alternative[]): Decision {
  return { id: 'd', title: 'D', factors, alternatives }
}

describe('analyzeSensitivity', () => {
  it('returns one entry per factor', () => {
    const d = decision(
      [factor('a', 1), factor('b', 1)],
      [alt('x', { a: 5, b: 5 })],
    )
    expect(analyzeSensitivity(d)).toHaveLength(2)
  })

  it('flags a factor whose removal changes the winner', () => {
    // With cost dominant, the cheap-but-mediocre option wins; muting cost flips it.
    const cost = factor('cost', 10, { direction: 'lower-is-better', scale: { kind: '0-100' } })
    const quality = factor('quality', 1)
    // Cheap: low cost (good), low quality. Premium: high cost (bad), high quality.
    const cheap = alt('cheap', { cost: 10, quality: 2 })
    const premium = alt('premium', { cost: 90, quality: 10 })
    const d = decision([cost, quality], [cheap, premium])

    const result = analyzeSensitivity(d)
    const costEntry = result.find((r) => r.factor.id === 'cost')!
    expect(costEntry.changesWinner).toBe(true)
    // cost is the most influential factor → sorted first
    expect(result[0]!.factor.id).toBe('cost')
  })

  it('a factor with no effect does not change the winner and has zero movement', () => {
    // Two factors, but one alternative dominates on both → muting either keeps order.
    const a = factor('a', 3)
    const b = factor('b', 1)
    const winner = alt('winner', { a: 10, b: 10 })
    const loser = alt('loser', { a: 1, b: 1 })
    const d = decision([a, b], [winner, loser])

    const result = analyzeSensitivity(d)
    for (const entry of result) {
      expect(entry.changesWinner).toBe(false)
      expect(entry.rankMovement).toBe(0)
    }
  })

  it('sorts winner-changing factors ahead of non-changing ones (either input order)', () => {
    const cost = factor('cost', 10, { direction: 'lower-is-better', scale: { kind: '0-100' } })
    const color = factor('color', 1) // trivial factor
    const cheap = alt('cheap', { cost: 10, color: 1 })
    const premium = alt('premium', { cost: 90, color: 10 })

    // cost listed FIRST
    let result = analyzeSensitivity(decision([cost, color], [cheap, premium]))
    expect(result[0]!.factor.id).toBe('cost')
    expect(result[0]!.changesWinner).toBe(true)
    expect(result[1]!.changesWinner).toBe(false)

    // cost listed LAST — still sorts to the front (exercises the other
    // comparator direction)
    result = analyzeSensitivity(decision([color, cost], [cheap, premium]))
    expect(result[0]!.factor.id).toBe('cost')
    expect(result[1]!.factor.id).toBe('color')
  })

  it('orders by rank movement when neither factor changes the winner', () => {
    // top always wins. Base order is top > low > mid. Muting "flat" reorders the
    // low/mid pair (movement > 0) without changing the winner; muting "swing"
    // leaves the order unchanged (movement 0). So flat is the more influential.
    const swing = factor('swing', 4, { name: 'Swing' })
    const flat = factor('flat', 1, { name: 'Flat' })
    const top = alt('top', { swing: 10, flat: 10 })
    const mid = alt('mid', { swing: 6, flat: 1 })
    const low = alt('low', { swing: 5, flat: 9 })

    // Assert exact order for BOTH input orderings, so a comparator that ignores
    // the changesWinner check (both false here) and mis-tie-breaks is caught.
    for (const factors of [
      [swing, flat],
      [flat, swing],
    ]) {
      const result = analyzeSensitivity(decision(factors, [top, mid, low]))
      expect(result.every((r) => !r.changesWinner)).toBe(true) // top always wins
      const flatEntry = result.find((r) => r.factor.id === 'flat')!
      const swingEntry = result.find((r) => r.factor.id === 'swing')!
      expect(flatEntry.rankMovement).toBeGreaterThan(0)
      expect(swingEntry.rankMovement).toBe(0)
      expect(result.map((r) => r.factor.id)).toEqual(['flat', 'swing']) // more movement first
    }
  })

  it('when two factors BOTH change the winner, orders them by rank movement', () => {
    // base winner is r. Muting A → winner q (movement 4); muting B → winner p
    // (movement 2). Both change the winner, so the comparator must fall through
    // to rank movement, putting A first.
    const a = factor('A', 5, { name: 'A' })
    const b = factor('B', 5, { name: 'B' })
    const p = alt('p', { A: 9, B: 1 })
    const q = alt('q', { A: 1, B: 9 })
    const r = alt('r', { A: 6, B: 6 })

    for (const factors of [
      [a, b],
      [b, a],
    ]) {
      const result = analyzeSensitivity(decision(factors, [p, q, r]))
      expect(result.every((x) => x.changesWinner)).toBe(true)
      const aMove = result.find((x) => x.factor.id === 'A')!.rankMovement
      const bMove = result.find((x) => x.factor.id === 'B')!.rankMovement
      expect(aMove).toBeGreaterThan(bMove)
      expect(result.map((x) => x.factor.id)).toEqual(['A', 'B']) // more movement first
    }
  })

  it('breaks ties by weight when changesWinner and movement are equal', () => {
    // Two symmetric no-effect factors: both false/0 → heavier weight wins.
    const heavy = factor('heavy', 5, { name: 'Zeta' }) // name deliberately LATE
    const light = factor('light', 1, { name: 'Alpha' }) // name deliberately EARLY
    const only = alt('only', { heavy: 5, light: 5 })
    const result = analyzeSensitivity(decision([light, heavy], [only]))
    // heavier weight must win despite its name sorting later → proves weight
    // tie-break runs before the name tie-break
    expect(result.map((r) => r.factor.id)).toEqual(['heavy', 'light'])
  })

  it('breaks ties by name when changesWinner, movement, and weight are all equal', () => {
    const beta = factor('beta', 2, { name: 'Beta' })
    const alpha = factor('alpha', 2, { name: 'Alpha' })
    const only = alt('only', { beta: 5, alpha: 5 })
    // listed beta-first, but equal weight → name ascending wins
    const result = analyzeSensitivity(decision([beta, alpha], [only]))
    expect(result.map((r) => r.factor.name)).toEqual(['Alpha', 'Beta'])
  })

  it('handles factors but no alternatives (no winner to change)', () => {
    const d = decision([factor('a', 1), factor('b', 2)], [])
    const result = analyzeSensitivity(d)
    expect(result).toHaveLength(2)
    for (const entry of result) {
      expect(entry.changesWinner).toBe(false)
      expect(entry.rankMovement).toBe(0)
    }
    // with everything tied, heavier weight sorts first
    expect(result[0]!.factor.id).toBe('b')
  })
})

describe('mostInfluentialFactor', () => {
  it('returns the top factor', () => {
    const cost = factor('cost', 10, { direction: 'lower-is-better', scale: { kind: '0-100' } })
    const quality = factor('quality', 1)
    const d = decision(
      [cost, quality],
      [alt('cheap', { cost: 10, quality: 2 }), alt('premium', { cost: 90, quality: 10 })],
    )
    expect(mostInfluentialFactor(d)!.factor.id).toBe('cost')
  })

  it('returns null when there are no factors', () => {
    expect(mostInfluentialFactor(decision([], []))).toBeNull()
  })
})
