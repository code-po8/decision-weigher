import { beforeEach, describe, expect, it } from 'vitest'
import { createDecisionStore } from './decisionStore'
import type { DecisionStore } from './decisionStore'
import type { StoreApi } from 'zustand'

// A deterministic id generator so tests can assert on ids.
function seqIds() {
  let n = 0
  return () => `id-${++n}`
}

let store: StoreApi<DecisionStore>
beforeEach(() => {
  store = createDecisionStore({ generateId: seqIds() })
})

const get = () => store.getState()

describe('createDecisionStore — initial state', () => {
  it('starts with an empty decision (title, no factors/alternatives)', () => {
    const d = get().decision
    expect(d.title).toBe('')
    expect(d.factors).toEqual([])
    expect(d.alternatives).toEqual([])
    expect(d.id).toBeTruthy()
  })

  it('accepts an initial decision', () => {
    const seeded = createDecisionStore({
      generateId: seqIds(),
      initial: { id: 'd', title: 'Buy a car', factors: [], alternatives: [] },
    })
    expect(seeded.getState().decision.title).toBe('Buy a car')
  })
})

describe('decision-level actions', () => {
  it('sets the title and description', () => {
    get().setTitle('Choose a car')
    get().setDescription('EV shortlist')
    expect(get().decision.title).toBe('Choose a car')
    expect(get().decision.description).toBe('EV shortlist')
  })

  it('replaces the whole decision (e.g. after import)', () => {
    get().replaceDecision({
      id: 'x',
      title: 'Imported',
      factors: [{ id: 'f', name: 'F', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } }],
      alternatives: [],
    })
    expect(get().decision.title).toBe('Imported')
    expect(get().decision.factors).toHaveLength(1)
  })

  it('resets to a fresh empty decision', () => {
    get().setTitle('something')
    get().addFactor({ name: 'F', weight: 2, direction: 'higher-is-better', scale: { kind: '0-10' } })
    get().reset()
    expect(get().decision.title).toBe('')
    expect(get().decision.factors).toEqual([])
  })
})

describe('factor actions', () => {
  it('adds a factor with a generated id and returns it', () => {
    const f = get().addFactor({
      name: 'Cost',
      weight: 5,
      direction: 'lower-is-better',
      scale: { kind: '0-100' },
    })
    expect(f.id).toMatch(/^id-\d+$/)
    expect(get().decision.factors).toHaveLength(1)
    expect(get().decision.factors[0]).toMatchObject({ id: f.id, name: 'Cost', weight: 5 })
  })

  it('rejects a factor with weight <= 0', () => {
    expect(() =>
      get().addFactor({ name: 'Bad', weight: 0, direction: 'higher-is-better', scale: { kind: '0-10' } }),
    ).toThrow(/weight/i)
    expect(() =>
      get().addFactor({ name: 'Bad', weight: -3, direction: 'higher-is-better', scale: { kind: '0-10' } }),
    ).toThrow(/weight/i)
    expect(get().decision.factors).toHaveLength(0)
  })

  it('rejects a factor with a blank name (error names the Factor)', () => {
    expect(() =>
      get().addFactor({ name: '  ', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } }),
    ).toThrow(/^Factor name must not be blank$/)
  })

  it('trims surrounding whitespace from a factor name', () => {
    const f = get().addFactor({ name: '  Cost  ', weight: 1, direction: 'lower-is-better', scale: { kind: '0-100' } })
    expect(get().decision.factors.find((x) => x.id === f.id)!.name).toBe('Cost')
  })

  it('updates an existing factor', () => {
    const f = get().addFactor({ name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    get().updateFactor(f.id, { weight: 8, name: 'Total cost' })
    const updated = get().decision.factors[0]!
    expect(updated.weight).toBe(8)
    expect(updated.name).toBe('Total cost')
    expect(updated.direction).toBe('lower-is-better') // unchanged fields preserved
    expect(updated.scale).toEqual({ kind: '0-100' }) // unchanged fields preserved
  })

  it('rejects a factor-name update to blank (error names the Factor)', () => {
    const f = get().addFactor({ name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    expect(() => get().updateFactor(f.id, { name: '   ' })).toThrow(/^Factor name must not be blank$/)
    expect(get().decision.factors[0]!.name).toBe('Cost')
  })

  it('updates a factor direction and scale, leaving other factors untouched', () => {
    const cost = get().addFactor({ name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    const looks = get().addFactor({ name: 'Looks', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    get().updateFactor(cost.id, { direction: 'higher-is-better', scale: { kind: '0-10' } })
    const updatedCost = get().decision.factors.find((f) => f.id === cost.id)!
    expect(updatedCost.direction).toBe('higher-is-better')
    expect(updatedCost.scale).toEqual({ kind: '0-10' })
    expect(updatedCost.name).toBe('Cost') // untouched
    // the other factor is unchanged
    expect(get().decision.factors.find((f) => f.id === looks.id)!).toEqual(looks)
  })

  it('throws when updating a factor that does not exist', () => {
    expect(() => get().updateFactor('missing', { weight: 2 })).toThrow(/unknown factor/i)
  })

  it('rejects an update that would make weight <= 0', () => {
    const f = get().addFactor({ name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    expect(() => get().updateFactor(f.id, { weight: 0 })).toThrow(/weight/i)
    expect(get().decision.factors[0]!.weight).toBe(5)
  })

  it('removes a factor and strips its ratings from every alternative', () => {
    const cost = get().addFactor({ name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    const looks = get().addFactor({ name: 'Looks', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const a = get().addAlternative({ name: 'Model 3' })
    get().setRating(a.id, cost.id, 40)
    get().setRating(a.id, looks.id, 7)

    get().removeFactor(cost.id)

    expect(get().decision.factors.map((f) => f.id)).toEqual([looks.id])
    // orphaned rating for the removed factor is gone
    expect(get().decision.alternatives[0]!.ratings).toEqual({ [looks.id]: 7 })
  })

  it('removing a factor leaves alternatives that never rated it untouched', () => {
    const cost = get().addFactor({ name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    const looks = get().addFactor({ name: 'Looks', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const a = get().addAlternative({ name: 'Model 3' })
    get().setRating(a.id, looks.id, 7) // rated looks only, never cost

    get().removeFactor(cost.id)

    // no rating for cost existed, so the alternative's ratings are unchanged
    expect(get().decision.alternatives[0]!.ratings).toEqual({ [looks.id]: 7 })
    expect(get().decision.factors.map((f) => f.id)).toEqual([looks.id])
  })
})

describe('alternative actions', () => {
  it('adds an alternative with a generated id and empty ratings', () => {
    const a = get().addAlternative({ name: 'Leaf' })
    expect(a.id).toMatch(/^id-\d+$/)
    expect(get().decision.alternatives[0]).toMatchObject({ id: a.id, name: 'Leaf', ratings: {} })
  })

  it('rejects a blank alternative name (error names the Alternative)', () => {
    expect(() => get().addAlternative({ name: '' })).toThrow(/^Alternative name must not be blank$/)
  })

  it('trims surrounding whitespace from an alternative name', () => {
    const a = get().addAlternative({ name: '  Leaf  ' })
    expect(get().decision.alternatives.find((x) => x.id === a.id)!.name).toBe('Leaf')
  })

  it('renames an alternative, leaving others untouched', () => {
    const leaf = get().addAlternative({ name: 'Leaf' })
    const m3 = get().addAlternative({ name: 'Model 3' })
    get().updateAlternative(leaf.id, { name: 'Nissan Leaf' })
    expect(get().decision.alternatives.find((a) => a.id === leaf.id)!.name).toBe('Nissan Leaf')
    expect(get().decision.alternatives.find((a) => a.id === m3.id)!.name).toBe('Model 3')
  })

  it('throws when updating an alternative that does not exist', () => {
    expect(() => get().updateAlternative('missing', { name: 'X' })).toThrow(/unknown alternative/i)
  })

  it('rejects an alternative-name update to blank (error names the Alternative)', () => {
    const a = get().addAlternative({ name: 'Leaf' })
    expect(() => get().updateAlternative(a.id, { name: ' ' })).toThrow(
      /^Alternative name must not be blank$/,
    )
    expect(get().decision.alternatives[0]!.name).toBe('Leaf')
  })

  it('applying an empty patch leaves the alternative unchanged', () => {
    const a = get().addAlternative({ name: 'Leaf' })
    get().updateAlternative(a.id, {})
    expect(get().decision.alternatives[0]!.name).toBe('Leaf')
  })

  it('removes an alternative', () => {
    const a = get().addAlternative({ name: 'Leaf' })
    get().addAlternative({ name: 'Model 3' })
    get().removeAlternative(a.id)
    expect(get().decision.alternatives.map((x) => x.name)).toEqual(['Model 3'])
  })
})

describe('rating actions', () => {
  let factorId: string
  let altId: string
  beforeEach(() => {
    const f = get().addFactor({ name: 'Range', weight: 3, direction: 'higher-is-better', scale: { kind: '0-100' } })
    const a = get().addAlternative({ name: 'Model 3' })
    factorId = f.id
    altId = a.id
  })

  it('sets a rating (decimals allowed)', () => {
    get().setRating(altId, factorId, 72.5)
    expect(get().decision.alternatives[0]!.ratings[factorId]).toBe(72.5)
  })

  it('rejects a rating above the factor scale max', () => {
    expect(() => get().setRating(altId, factorId, 150)).toThrow(/range|scale|0-100|100/i)
    expect(get().decision.alternatives[0]!.ratings[factorId]).toBeUndefined()
  })

  it('rejects a rating just above the scale max but accepts exactly the max', () => {
    expect(() => get().setRating(altId, factorId, 100.0001)).toThrow()
    get().setRating(altId, factorId, 100)
    expect(get().decision.alternatives[0]!.ratings[factorId]).toBe(100)
  })

  it('accepts a rating of exactly 0 but rejects just below 0', () => {
    get().setRating(altId, factorId, 0)
    expect(get().decision.alternatives[0]!.ratings[factorId]).toBe(0)
    expect(() => get().setRating(altId, factorId, -0.0001)).toThrow()
  })

  it('rejects a negative rating', () => {
    expect(() => get().setRating(altId, factorId, -1)).toThrow()
  })

  it('rejects a rating for an unknown factor or alternative', () => {
    expect(() => get().setRating(altId, 'nope', 5)).toThrow(/factor/i)
    expect(() => get().setRating('nope', factorId, 5)).toThrow(/alternative/i)
  })

  it('clears a rating', () => {
    get().setRating(altId, factorId, 50)
    get().clearRating(altId, factorId)
    expect(get().decision.alternatives[0]!.ratings[factorId]).toBeUndefined()
  })

  it('clearing an unset rating is a no-op (does not throw)', () => {
    expect(() => get().clearRating(altId, factorId)).not.toThrow()
    expect(get().decision.alternatives[0]!.ratings).toEqual({})
  })

  it('throws when clearing a rating on an unknown alternative', () => {
    expect(() => get().clearRating('missing', factorId)).toThrow(/unknown alternative/i)
  })

  it('accepts a rating exactly at the scale max', () => {
    get().setRating(altId, factorId, 100)
    expect(get().decision.alternatives[0]!.ratings[factorId]).toBe(100)
  })

  it('setting a rating leaves other alternatives untouched', () => {
    const other = get().addAlternative({ name: 'Other' })
    get().setRating(altId, factorId, 30)
    expect(get().decision.alternatives.find((a) => a.id === other.id)!.ratings).toEqual({})
  })
})

describe('immutability / referential identity', () => {
  it('updateFactor returns the SAME object reference for untouched factors', () => {
    const cost = get().addFactor({ name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    const looks = get().addFactor({ name: 'Looks', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const looksBefore = get().decision.factors.find((f) => f.id === looks.id)!
    get().updateFactor(cost.id, { weight: 9 })
    const looksAfter = get().decision.factors.find((f) => f.id === looks.id)!
    expect(looksAfter).toBe(looksBefore) // untouched factor not needlessly cloned
    // updated factor IS a new object (not mutated in place)
    expect(get().decision.factors.find((f) => f.id === cost.id)!).not.toBe(cost)
  })

  it('removeFactor keeps the SAME ratings object for alternatives that never rated it', () => {
    const cost = get().addFactor({ name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    get().addFactor({ name: 'Looks', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const a = get().addAlternative({ name: 'Model 3' })
    const ratingsBefore = get().decision.alternatives.find((x) => x.id === a.id)!.ratings
    get().removeFactor(cost.id) // a never rated cost
    const ratingsAfter = get().decision.alternatives.find((x) => x.id === a.id)!.ratings
    expect(ratingsAfter).toBe(ratingsBefore) // untouched ratings not cloned
  })

  it('removeFactor produces a NEW ratings object when it strips a rating', () => {
    const cost = get().addFactor({ name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } })
    const a = get().addAlternative({ name: 'Model 3' })
    get().setRating(a.id, cost.id, 40)
    const ratingsBefore = get().decision.alternatives.find((x) => x.id === a.id)!.ratings
    get().removeFactor(cost.id)
    const ratingsAfter = get().decision.alternatives.find((x) => x.id === a.id)!.ratings
    expect(ratingsAfter).not.toBe(ratingsBefore) // rewritten without the stripped key
    expect(ratingsAfter).toEqual({})
  })

  it('clearRating leaves the SAME ratings object when the key was absent', () => {
    const f = get().addFactor({ name: 'F', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const a = get().addAlternative({ name: 'A' })
    const before = get().decision.alternatives.find((x) => x.id === a.id)!.ratings
    get().clearRating(a.id, f.id) // nothing to clear
    const after = get().decision.alternatives.find((x) => x.id === a.id)!.ratings
    expect(after).toBe(before)
  })

  it('clearRating produces a NEW ratings object without the cleared key', () => {
    const f = get().addFactor({ name: 'F', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const a = get().addAlternative({ name: 'A' })
    get().setRating(a.id, f.id, 5)
    const before = get().decision.alternatives.find((x) => x.id === a.id)!.ratings
    get().clearRating(a.id, f.id)
    const after = get().decision.alternatives.find((x) => x.id === a.id)!.ratings
    expect(after).not.toBe(before)
    expect(f.id in after).toBe(false)
  })

  it('clearRating removes only the target key, keeping the other ratings', () => {
    const f1 = get().addFactor({ name: 'F1', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const f2 = get().addFactor({ name: 'F2', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const a = get().addAlternative({ name: 'A' })
    get().setRating(a.id, f1.id, 5)
    get().setRating(a.id, f2.id, 8)
    get().clearRating(a.id, f1.id)
    // f1 gone, f2 retained (kills the "{...a.ratings} -> {}" mutant)
    expect(get().decision.alternatives[0]!.ratings).toEqual({ [f2.id]: 8 })
  })

  it('clearRating on one alternative does not touch an identical rating on another', () => {
    const f = get().addFactor({ name: 'F', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const a = get().addAlternative({ name: 'A' })
    const b = get().addAlternative({ name: 'B' })
    get().setRating(a.id, f.id, 5)
    get().setRating(b.id, f.id, 5)
    get().clearRating(a.id, f.id)
    // only A's rating cleared (kills dropping the `a.id !== alternativeId` guard)
    expect(get().decision.alternatives.find((x) => x.id === a.id)!.ratings).toEqual({})
    expect(get().decision.alternatives.find((x) => x.id === b.id)!.ratings).toEqual({ [f.id]: 5 })
  })
})

describe('derived ranking selector', () => {
  it('returns alternatives ranked best to worst', () => {
    const q = get().addFactor({ name: 'Quality', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const leaf = get().addAlternative({ name: 'Leaf' })
    const m3 = get().addAlternative({ name: 'Model 3' })
    get().setRating(leaf.id, q.id, 4)
    get().setRating(m3.id, q.id, 9)

    const ranked = get().ranking()
    expect(ranked.map((r) => r.alternative.name)).toEqual(['Model 3', 'Leaf'])
    expect(ranked[0]!.rank).toBe(1)
  })

  it('reflects live edits (recomputes on each call)', () => {
    const q = get().addFactor({ name: 'Quality', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } })
    const a = get().addAlternative({ name: 'A' })
    get().setRating(a.id, q.id, 2)
    expect(get().ranking()[0]!.score).toBeCloseTo(0.2)
    get().setRating(a.id, q.id, 8)
    expect(get().ranking()[0]!.score).toBeCloseTo(0.8)
  })
})

describe('default id generator', () => {
  it('produces unique ids without an injected generator', () => {
    const real = createDecisionStore()
    const a = real.getState().addFactor({
      name: 'A',
      weight: 1,
      direction: 'higher-is-better',
      scale: { kind: '0-10' },
    })
    const b = real.getState().addFactor({
      name: 'B',
      weight: 1,
      direction: 'higher-is-better',
      scale: { kind: '0-10' },
    })
    expect(a.id).not.toBe(b.id)
    expect(a.id).toBeTruthy()
  })
})
