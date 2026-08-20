// Display formatting helpers for results. Scores are 0..1 internally; users see
// them on the familiar 0–10 scale and as a percentage.

/** Format a 0..1 score as a 0–10 value with one decimal (e.g. 0.732 → "7.3"). */
export function scoreToTen(score: number): string {
  return (score * 10).toFixed(1)
}

/** Format a 0..1 score as a whole percentage (e.g. 0.732 → "73%"). */
export function scoreToPercent(score: number): string {
  return `${Math.round(score * 100)}%`
}
