import {
  scaleMax,
  normalizeRating,
  adjustForDirection,
  factorContribution,
  score,
  rank,
} from './scoring'
import type { Decision, Factor, Alternative } from './types'

// --- Test builders -------------------------------------------------------

let seq = 0
function factor(overrides: Partial<Factor> = {}): Factor {
  seq += 1
  return {
    id: overrides.id ?? `f${seq}`,
    name: overrides.name ?? `Factor ${seq}`,
    weight: overrides.weight ?? 1,
    direction: overrides.direction ?? 'higher-is-better',
    scale: overrides.scale ?? { kind: '0-10' },
  }
}

function alt(name: string, ratings: Record<string, number>): Alternative {
  return { id: name.toLowerCase(), name, ratings }
}

function decision(factors: Factor[], alternatives: Alternative[]): Decision {
  return { id: 'd1', title: 'Decision', factors, alternatives }
}

// --- scaleMax ------------------------------------------------------------

describe('scaleMax', () => {
  it('maps each scale kind to its maximum', () => {
    expect(scaleMax({ kind: '0-10' })).toBe(10)
    expect(scaleMax({ kind: '0-100' })).toBe(100)
    expect(scaleMax({ kind: 'boolean' })).toBe(1)
  })
})

// --- normalizeRating -----------------------------------------------------

describe('normalizeRating', () => {
  it('normalizes a rating to 0..1 by the scale max', () => {
    expect(normalizeRating(5, { kind: '0-10' })).toBeCloseTo(0.5)
    expect(normalizeRating(25, { kind: '0-100' })).toBeCloseTo(0.25)
    expect(normalizeRating(1, { kind: 'boolean' })).toBe(1)
    expect(normalizeRating(0, { kind: 'boolean' })).toBe(0)
  })

  it('preserves decimal precision', () => {
    expect(normalizeRating(7.5, { kind: '0-10' })).toBeCloseTo(0.75)
  })

  it('clamps ratings above the scale max to 1', () => {
    expect(normalizeRating(15, { kind: '0-10' })).toBe(1)
    expect(normalizeRating(250, { kind: '0-100' })).toBe(1)
  })

  it('clamps negative ratings to 0', () => {
    expect(normalizeRating(-4, { kind: '0-10' })).toBe(0)
  })
})

// --- adjustForDirection --------------------------------------------------

describe('adjustForDirection', () => {
  it('passes through a higher-is-better factor unchanged', () => {
    expect(adjustForDirection(0.8, 'higher-is-better')).toBeCloseTo(0.8)
  })

  it('inverts a lower-is-better factor so a low value scores high', () => {
    // low cost (normalized 0.2) should become a strong 0.8
    expect(adjustForDirection(0.2, 'lower-is-better')).toBeCloseTo(0.8)
    expect(adjustForDirection(1, 'lower-is-better')).toBeCloseTo(0)
    expect(adjustForDirection(0, 'lower-is-better')).toBeCloseTo(1)
  })
})

// --- factorContribution --------------------------------------------------

describe('factorContribution', () => {
  it('returns the direction-adjusted, normalized value for a rating', () => {
    const cost = factor({ id: 'cost', direction: 'lower-is-better', scale: { kind: '0-100' } })
    const a = alt('A', { cost: 20 })
    // norm 0.2 → adj 0.8
    expect(factorContribution(cost, a)).toBeCloseTo(0.8)
  })

  it('treats a missing rating as 0 on the scale (no credit)', () => {
    const f = factor({ id: 'range', direction: 'higher-is-better' })
    const a = alt('A', {}) // no rating for 'range'
    expect(factorContribution(f, a)).toBe(0)
  })

  it('a missing rating on a lower-is-better factor consistently yields full credit', () => {
    // documents the chosen rule: missing == 0 == best possible for lower-is-better
    const f = factor({ id: 'cost', direction: 'lower-is-better' })
    const a = alt('A', {})
    expect(factorContribution(f, a)).toBe(1)
  })
})

// --- score ---------------------------------------------------------------

describe('score', () => {
  it('is the weighted average of adjusted contributions, on a 0..1 scale', () => {
    const quality = factor({ id: 'q', weight: 3, direction: 'higher-is-better' })
    const price = factor({ id: 'p', weight: 1, direction: 'lower-is-better', scale: { kind: '0-100' } })
    const d = decision([quality, price], [])
    const a = alt('A', { q: 8, p: 40 })
    // quality: norm 0.8, adj 0.8; price: norm 0.4, adj 0.6
    // score = (0.8*3 + 0.6*1) / (3+1) = (2.4 + 0.6)/4 = 0.75
    expect(score(d, a)).toBeCloseTo(0.75)
  })

  it('combines mixed scales fairly (0-100 does not swamp 0-10)', () => {
    const small = factor({ id: 's', weight: 1, scale: { kind: '0-10' } })
    const big = factor({ id: 'b', weight: 1, scale: { kind: '0-100' } })
    const d = decision([small, big], [])
    // both rated at half their scale → both normalize to 0.5 → score 0.5
    const a = alt('A', { s: 5, b: 50 })
    expect(score(d, a)).toBeCloseTo(0.5)
  })

  it('handles a boolean factor', () => {
    const nacs = factor({ id: 'nacs', weight: 2, scale: { kind: 'boolean' } })
    const other = factor({ id: 'o', weight: 2, scale: { kind: '0-10' } })
    const d = decision([nacs, other], [])
    const yes = alt('Yes', { nacs: 1, o: 0 })
    const no = alt('No', { nacs: 0, o: 0 })
    expect(score(d, yes)).toBeCloseTo(0.5) // (1*2 + 0*2)/4
    expect(score(d, no)).toBeCloseTo(0)
  })

  it('respects weights: a heavier factor dominates', () => {
    const heavy = factor({ id: 'h', weight: 9 })
    const light = factor({ id: 'l', weight: 1 })
    const d = decision([heavy, light], [])
    const a = alt('A', { h: 10, l: 0 }) // heavy maxed, light zero
    expect(score(d, a)).toBeCloseTo(0.9)
  })

  it('returns 0 when there are no factors (zero total weight)', () => {
    const d = decision([], [])
    expect(score(d, alt('A', {}))).toBe(0)
  })

  it('clamps out-of-range ratings before scoring', () => {
    const f = factor({ id: 'f', weight: 1, scale: { kind: '0-10' } })
    const d = decision([f], [])
    expect(score(d, alt('Over', { f: 999 }))).toBeCloseTo(1)
    expect(score(d, alt('Under', { f: -5 }))).toBeCloseTo(0)
  })
})

// --- rank ----------------------------------------------------------------

describe('rank', () => {
  it('orders alternatives from best to worst by score', () => {
    const q = factor({ id: 'q', weight: 1 })
    const leaf = alt('Leaf', { q: 4 })
    const mache = alt('Mach-E', { q: 7 })
    const model3 = alt('Model 3', { q: 9 })
    const d = decision([q], [leaf, mache, model3])

    const ranked = rank(d)
    expect(ranked.map((r) => r.alternative.name)).toEqual(['Model 3', 'Mach-E', 'Leaf'])
    expect(ranked[0]!.rank).toBe(1)
    expect(ranked[2]!.rank).toBe(3)
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score)
  })

  it('breaks ties deterministically by name (ascending)', () => {
    const q = factor({ id: 'q', weight: 1 })
    const d = decision([q], [alt('Beta', { q: 5 }), alt('Alpha', { q: 5 })])
    const ranked = rank(d)
    expect(ranked.map((r) => r.alternative.name)).toEqual(['Alpha', 'Beta'])
    // tied scores share neither rank arbitrarily; both are computed the same
    expect(ranked[0]!.score).toBeCloseTo(ranked[1]!.score)
  })

  it('includes per-factor contributions for each alternative', () => {
    const cost = factor({ id: 'cost', weight: 2, direction: 'lower-is-better', scale: { kind: '0-100' } })
    const looks = factor({ id: 'looks', weight: 1 })
    const d = decision([cost, looks], [alt('A', { cost: 20, looks: 8 })])

    const [entry] = rank(d)
    expect(entry!.contributions).toHaveLength(2)
    const byId = Object.fromEntries(entry!.contributions.map((c) => [c.factorId, c]))
    // cost: norm 0.2 → adj 0.8, weight 2 → weighted 1.6
    expect(byId.cost!.adjusted).toBeCloseTo(0.8)
    expect(byId.cost!.weighted).toBeCloseTo(1.6)
    // looks: norm 0.8 → adj 0.8, weight 1 → weighted 0.8
    expect(byId.looks!.weighted).toBeCloseTo(0.8)
    // weighted contributions divided by total weight sum to the score
    const totalWeight = 3
    const summed = entry!.contributions.reduce((s, c) => s + c.weighted, 0) / totalWeight
    expect(summed).toBeCloseTo(entry!.score)
  })

  it('returns an empty ranking for no alternatives', () => {
    const d = decision([factor()], [])
    expect(rank(d)).toEqual([])
  })

  it('ranks the car example correctly end to end', () => {
    const cost = factor({ id: 'cost', name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    const reliability = factor({ id: 'rel', name: 'Reliability', weight: 5 })
    const looks = factor({ id: 'looks', name: 'Looks', weight: 1 })
    const range = factor({ id: 'range', name: 'Range', weight: 3, scale: { kind: '0-100' } })
    const nacs = factor({ id: 'nacs', name: 'NACS', weight: 2, scale: { kind: 'boolean' } })

    const model3 = alt('Model 3', { cost: 45, rel: 8, looks: 7, range: 70, nacs: 1 })
    const mache = alt('Mach-E', { cost: 55, rel: 7, looks: 8, range: 65, nacs: 1 })
    const leaf = alt('Leaf', { cost: 30, rel: 7, looks: 5, range: 40, nacs: 0 })

    const d = decision([cost, reliability, looks, range, nacs], [model3, mache, leaf])
    const ranked = rank(d)

    // Sanity: every score in 0..1 and ranks are 1..n contiguous
    expect(ranked).toHaveLength(3)
    ranked.forEach((r, i) => {
      expect(r.rank).toBe(i + 1)
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(1)
    })
    // Ordered descending
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[1]!.score)
    expect(ranked[1]!.score).toBeGreaterThanOrEqual(ranked[2]!.score)
  })
})
