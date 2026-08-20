// Shared option lists for factor direction and scale selects, reused by the
// add form and the inline row editor.

import type { Direction, Scale } from '../../domain/types'

export const DIRECTION_OPTIONS: { value: Direction; label: string }[] = [
  { value: 'higher-is-better', label: 'Higher is better' },
  { value: 'lower-is-better', label: 'Lower is better' },
]

export const SCALE_OPTIONS: { value: Scale['kind']; label: string }[] = [
  { value: '0-10', label: '0–10' },
  { value: '0-100', label: '0–100' },
  { value: 'boolean', label: 'Yes / No' },
]
