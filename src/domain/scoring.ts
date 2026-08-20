// Pure scoring engine for a weighted decision.
//
// Because factors can use different scales (0-10, 0-100, boolean), every rating
// is first normalized to 0..1, then direction-adjusted (so a low cost helps),
// then combined as a weight-weighted average. The result stays in 0..1
// regardless of the number of factors or their scales, so alternatives — and
// even different decisions — are comparable.
//
// score(alt) = Σ_f (adj_f · weight_f) / Σ_f weight_f
//
// Conventions (chosen deliberately, covered by tests):
//   - A missing rating counts as 0 on its scale (no data → no credit). For a
//     lower-is-better factor that consistently means full credit, which is the
//     honest application of the same rule rather than a special case.
//   - Ratings outside [0, scaleMax] are clamped.
//   - No factors (zero total weight) → score 0.
//   - Ties in rank() are broken by name, ascending, for stable ordering.

import type {
  Alternative,
  Contribution,
  Decision,
  Direction,
  Factor,
  RankedAlternative,
  Scale,
} from './types'

/** The maximum raw value a scale can take. */
export function scaleMax(scale: Scale): number {
  switch (scale.kind) {
    case '0-10':
      return 10
    case '0-100':
      return 100
    case 'boolean':
      return 1
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Map a raw rating onto 0..1 for its scale, clamping out-of-range values. */
export function normalizeRating(rating: number, scale: Scale): number {
  const max = scaleMax(scale)
  return clamp(rating, 0, max) / max
}

/** Flip a normalized value for lower-is-better factors so low raw values score high. */
export function adjustForDirection(normalized: number, direction: Direction): number {
  return direction === 'lower-is-better' ? 1 - normalized : normalized
}

/** A single factor's direction-adjusted, normalized value for one alternative. */
export function factorContribution(factor: Factor, alternative: Alternative): number {
  const raw = alternative.ratings[factor.id] ?? 0
  const normalized = normalizeRating(raw, factor.scale)
  return adjustForDirection(normalized, factor.direction)
}

function totalWeight(factors: Factor[]): number {
  return factors.reduce((sum, f) => sum + f.weight, 0)
}

/** Overall score for an alternative, in 0..1. Returns 0 when total weight is 0. */
export function score(decision: Decision, alternative: Alternative): number {
  const weightSum = totalWeight(decision.factors)
  if (weightSum === 0) return 0
  const weighted = decision.factors.reduce(
    (sum, f) => sum + factorContribution(f, alternative) * f.weight,
    0,
  )
  return weighted / weightSum
}

function contributionsFor(decision: Decision, alternative: Alternative): Contribution[] {
  return decision.factors.map((f) => {
    const adjusted = factorContribution(f, alternative)
    return { factorId: f.id, adjusted, weighted: adjusted * f.weight }
  })
}

/**
 * Rank all alternatives best → worst. Each entry carries its 0..1 score, a
 * 1-based rank, and the per-factor contribution breakdown. Ties break by name
 * (ascending) so the order is deterministic.
 */
export function rank(decision: Decision): RankedAlternative[] {
  const scored = decision.alternatives.map((alternative) => ({
    alternative,
    score: score(decision, alternative),
    contributions: contributionsFor(decision, alternative),
  }))

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.alternative.name.localeCompare(b.alternative.name)
  })

  return scored.map((entry, index) => ({ ...entry, rank: index + 1 }))
}
