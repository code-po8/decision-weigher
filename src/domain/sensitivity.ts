// Sensitivity analysis (pure).
//
// Answers: "which factor's weight, if changed, most affects the outcome?" For
// each factor we re-rank the decision with that factor's weight removed (set to
// a tiny epsilon so total weight stays positive) and measure how much the
// ranking shifts. The factor producing the largest shift is the most
// influential — e.g. "if you cared less about cost, a different car would win".
//
// Shift metric: whether the winner changes (weighted heavily), plus the summed
// absolute change in each alternative's rank position (a tie-aware measure of
// reordering). This is a heuristic decision aid, not a formal statistic.

import type { Decision, Factor } from './types'
import { rank } from './scoring'

export interface FactorSensitivity {
  factor: Factor
  /** True if removing this factor's weight changes which alternative wins. */
  changesWinner: boolean
  /** Total absolute rank movement across alternatives when this factor is muted. */
  rankMovement: number
}

const EPSILON = 1e-9

/** Rank positions keyed by alternative id for the given decision. */
function rankPositions(decision: Decision): Map<string, number> {
  const positions = new Map<string, number>()
  for (const entry of rank(decision)) {
    positions.set(entry.alternative.id, entry.rank)
  }
  return positions
}

/** Sensitivity of each factor, most influential first. */
export function analyzeSensitivity(decision: Decision): FactorSensitivity[] {
  const basePositions = rankPositions(decision)
  const baseWinner = rank(decision)[0]?.alternative.id

  const results = decision.factors.map((factor): FactorSensitivity => {
    const muted: Decision = {
      ...decision,
      factors: decision.factors.map((f) => (f.id === factor.id ? { ...f, weight: EPSILON } : f)),
    }
    const mutedPositions = rankPositions(muted)
    const mutedWinner = rank(muted)[0]?.alternative.id

    // Both rankings cover the exact same alternative set, so every base id also
    // appears in mutedPositions — no fallback needed.
    let rankMovement = 0
    for (const [id, basePos] of basePositions) {
      const mutedPos = mutedPositions.get(id)!
      rankMovement += Math.abs(basePos - mutedPos)
    }

    // Muting a weight never adds or removes alternatives, so baseWinner and
    // mutedWinner are either both defined or both undefined (empty). A plain
    // inequality is therefore sufficient: undefined !== undefined is false (no
    // change), and two defined ids compare directly.
    return {
      factor,
      changesWinner: baseWinner !== mutedWinner,
      rankMovement,
    }
  })

  // Most influential first: winner-changers rank above non-changers; within each
  // group, more rank movement first; then heavier weight; then name for stability.
  //
  // NOTE: the changesWinner check below is near-equivalent to the rankMovement
  // check for ordering purposes — a winner change always contributes >= 2 to
  // rankMovement, so a winner-changer rarely has less movement than a
  // non-changer. Mutation testing flags forcing this condition false as a
  // surviving (effectively equivalent) mutant. The flag is kept because it is
  // also surfaced to the user in the Sensitivity tab, where it is meaningful.
  return results.sort((a, b) => {
    if (a.changesWinner !== b.changesWinner) return a.changesWinner ? -1 : 1
    if (b.rankMovement !== a.rankMovement) return b.rankMovement - a.rankMovement
    if (b.factor.weight !== a.factor.weight) return b.factor.weight - a.factor.weight
    return a.factor.name.localeCompare(b.factor.name)
  })
}

/** The single most influential factor, or null if there are no factors. */
export function mostInfluentialFactor(decision: Decision): FactorSensitivity | null {
  return analyzeSensitivity(decision)[0] ?? null
}
