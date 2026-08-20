// Core domain types for a weighted decision.
//
// A Decision has Factors (things that matter, each weighted) and Alternatives
// (the options being compared, each rated on every factor). Scoring lives in
// ./scoring.ts and is pure.

/** How a factor's ratings are entered and bounded. `boolean` is yes(1)/no(0). */
export type Scale = { kind: '0-10' } | { kind: '0-100' } | { kind: 'boolean' }

/** Whether a higher raw rating is better (range, reliability) or worse (cost, wait time). */
export type Direction = 'higher-is-better' | 'lower-is-better'

export interface Factor {
  id: string
  name: string
  /** Relative importance. Must be > 0. */
  weight: number
  direction: Direction
  scale: Scale
}

export interface Alternative {
  id: string
  name: string
  /** Rating per factor id. Decimals allowed. A missing entry counts as 0 on the scale. */
  ratings: Record<string, number>
}

export interface Decision {
  id: string
  title: string
  description?: string
  factors: Factor[]
  alternatives: Alternative[]
}

/** One factor's contribution to an alternative's score. */
export interface Contribution {
  factorId: string
  /** Normalized 0..1 rating, direction-adjusted (low cost → high adjusted). */
  adjusted: number
  /** adjusted * factor weight (pre-division by total weight). */
  weighted: number
}

/** A ranked alternative: its overall score, 1-based rank, and per-factor breakdown. */
export interface RankedAlternative {
  alternative: Alternative
  /** Overall score in 0..1. */
  score: number
  /** 1-based position (1 = winner). */
  rank: number
  contributions: Contribution[]
}
