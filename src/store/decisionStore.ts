// Decision store (Zustand).
//
// Holds the single in-progress decision and exposes actions to mutate it. The
// ranking is NOT stored — it is a pure selector delegating to the DW-001 engine,
// so it can never drift out of sync with the underlying decision.
//
// This is the app's input boundary, so it validates: weights must be > 0, names
// must be non-blank, and ratings must fall within their factor's scale. Invalid
// input throws (a UI-contract error the input components guard against); the
// engine's own clamping remains as defense-in-depth.

import { createStore } from 'zustand/vanilla'
import type {
  Alternative,
  Decision,
  Direction,
  Factor,
  RankedAlternative,
  Scale,
} from '../domain/types'
import { rank, scaleMax } from '../domain/scoring'

/** Fields provided when creating a factor (id is generated). */
export interface FactorInput {
  name: string
  weight: number
  direction: Direction
  scale: Scale
}

/** Fields provided when creating an alternative (id is generated, ratings start empty). */
export interface AlternativeInput {
  name: string
}

export interface DecisionState {
  decision: Decision
}

export interface DecisionActions {
  setTitle(title: string): void
  setDescription(description: string): void
  replaceDecision(decision: Decision): void
  reset(): void

  addFactor(input: FactorInput): Factor
  updateFactor(id: string, patch: Partial<FactorInput>): void
  removeFactor(id: string): void

  addAlternative(input: AlternativeInput): Alternative
  updateAlternative(id: string, patch: Partial<AlternativeInput>): void
  removeAlternative(id: string): void

  setRating(alternativeId: string, factorId: string, value: number): void
  clearRating(alternativeId: string, factorId: string): void

  /** Alternatives ranked best → worst (pure, recomputed from current state). */
  ranking(): RankedAlternative[]
}

export type DecisionStore = DecisionState & DecisionActions

export interface CreateDecisionStoreOptions {
  /** Injectable id generator (deterministic in tests). Defaults to crypto.randomUUID. */
  generateId?: () => string
  /** Seed decision (e.g. for an imported decision or tests). */
  initial?: Decision
}

function emptyDecision(id: string): Decision {
  return { id, title: '', factors: [], alternatives: [] }
}

function requireName(name: string, label: string): string {
  const trimmed = name.trim()
  if (trimmed === '') throw new Error(`${label} name must not be blank`)
  return trimmed
}

function requirePositiveWeight(weight: number): number {
  if (!(weight > 0)) throw new Error(`Factor weight must be greater than 0 (got ${weight})`)
  return weight
}

export function createDecisionStore(options: CreateDecisionStoreOptions = {}) {
  const generateId = options.generateId ?? (() => crypto.randomUUID())

  return createStore<DecisionStore>((set, getState) => {
    const findFactor = (id: string): Factor => {
      const factor = getState().decision.factors.find((f) => f.id === id)
      if (!factor) throw new Error(`Unknown factor: ${id}`)
      return factor
    }
    const findAlternative = (id: string): Alternative => {
      const alt = getState().decision.alternatives.find((a) => a.id === id)
      if (!alt) throw new Error(`Unknown alternative: ${id}`)
      return alt
    }

    return {
      decision: options.initial ?? emptyDecision(generateId()),

      setTitle(title) {
        set((s) => ({ decision: { ...s.decision, title } }))
      },

      setDescription(description) {
        set((s) => ({ decision: { ...s.decision, description } }))
      },

      replaceDecision(decision) {
        set({ decision })
      },

      reset() {
        set({ decision: emptyDecision(generateId()) })
      },

      addFactor(input) {
        const name = requireName(input.name, 'Factor')
        const weight = requirePositiveWeight(input.weight)
        const factor: Factor = {
          id: generateId(),
          name,
          weight,
          direction: input.direction,
          scale: input.scale,
        }
        set((s) => ({
          decision: { ...s.decision, factors: [...s.decision.factors, factor] },
        }))
        return factor
      },

      updateFactor(id, patch) {
        findFactor(id)
        const next: Partial<Factor> = {}
        if (patch.name !== undefined) next.name = requireName(patch.name, 'Factor')
        if (patch.weight !== undefined) next.weight = requirePositiveWeight(patch.weight)
        if (patch.direction !== undefined) next.direction = patch.direction
        if (patch.scale !== undefined) next.scale = patch.scale
        set((s) => ({
          decision: {
            ...s.decision,
            factors: s.decision.factors.map((f) => (f.id === id ? { ...f, ...next } : f)),
          },
        }))
      },

      removeFactor(id) {
        set((s) => ({
          decision: {
            ...s.decision,
            factors: s.decision.factors.filter((f) => f.id !== id),
            // strip the removed factor's rating from every alternative
            alternatives: s.decision.alternatives.map((a) => {
              if (!(id in a.ratings)) return a
              const ratings = { ...a.ratings }
              delete ratings[id]
              return { ...a, ratings }
            }),
          },
        }))
      },

      addAlternative(input) {
        const name = requireName(input.name, 'Alternative')
        const alternative: Alternative = { id: generateId(), name, ratings: {} }
        set((s) => ({
          decision: {
            ...s.decision,
            alternatives: [...s.decision.alternatives, alternative],
          },
        }))
        return alternative
      },

      updateAlternative(id, patch) {
        findAlternative(id)
        const next: Partial<Alternative> = {}
        if (patch.name !== undefined) next.name = requireName(patch.name, 'Alternative')
        set((s) => ({
          decision: {
            ...s.decision,
            alternatives: s.decision.alternatives.map((a) =>
              a.id === id ? { ...a, ...next } : a,
            ),
          },
        }))
      },

      removeAlternative(id) {
        set((s) => ({
          decision: {
            ...s.decision,
            alternatives: s.decision.alternatives.filter((a) => a.id !== id),
          },
        }))
      },

      setRating(alternativeId, factorId, value) {
        findAlternative(alternativeId)
        const factor = findFactor(factorId)
        const max = scaleMax(factor.scale)
        if (value < 0 || value > max) {
          throw new Error(
            `Rating ${value} is outside the ${factor.scale.kind} scale [0, ${max}] for factor "${factor.name}"`,
          )
        }
        set((s) => ({
          decision: {
            ...s.decision,
            alternatives: s.decision.alternatives.map((a) =>
              a.id === alternativeId
                ? { ...a, ratings: { ...a.ratings, [factorId]: value } }
                : a,
            ),
          },
        }))
      },

      clearRating(alternativeId, factorId) {
        findAlternative(alternativeId)
        set((s) => ({
          decision: {
            ...s.decision,
            alternatives: s.decision.alternatives.map((a) => {
              if (a.id !== alternativeId || !(factorId in a.ratings)) return a
              const ratings = { ...a.ratings }
              delete ratings[factorId]
              return { ...a, ratings }
            }),
          },
        }))
      },

      ranking() {
        return rank(getState().decision)
      },
    }
  })
}
