// JSON export / import for a Decision.
//
// Export wraps the decision in a small envelope carrying a schema version, so
// future format changes are detectable. Import treats its input as UNTRUSTED
// (it may be an arbitrary file a user picked) and validates structure, types,
// and value ranges before returning a typed Decision — rejecting anything that
// doesn't fit with a descriptive ImportError. No external schema-validation
// dependency is used, to keep the pinned-dependency surface minimal.

import type { Alternative, Decision, Direction, Factor, Scale } from './types'
import { scaleMax } from './scoring'

/** Bump when the on-disk shape changes in a breaking way. */
export const DECISION_SCHEMA_VERSION = 1

/** Reject inputs larger than this (bytes) before parsing, to avoid hanging the tab. */
export const MAX_IMPORT_BYTES = 5_000_000 // 5 MB — orders of magnitude above any real decision

/** Thrown when an import payload is malformed or fails validation. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

interface Envelope {
  schemaVersion: number
  decision: Decision
}

/** Serialize a decision to a pretty-printed JSON string with a schema envelope. */
export function exportDecision(decision: Decision): string {
  const envelope: Envelope = { schemaVersion: DECISION_SCHEMA_VERSION, decision }
  return JSON.stringify(envelope, null, 2)
}

// --- validation helpers --------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ImportError(`Field "${field}" must be a string`)
  return value
}

function requireNonBlank(value: unknown, field: string): string {
  const s = requireString(value, field)
  if (s.trim() === '') throw new ImportError(`Field "${field}" must not be blank`)
  return s
}

function requireFiniteNumber(value: unknown, field: string): number {
  // NOTE: JSON cannot represent NaN/Infinity — JSON.parse turns them into null
  // — so any non-finite value arrives here as a non-number and is caught by the
  // typeof check alone. A redundant Number.isFinite guard would be dead code
  // (unreachable through the parse path), so it is intentionally omitted.
  if (typeof value !== 'number') {
    throw new ImportError(`Field "${field}" must be a finite number`)
  }
  return value
}

const SCALE_KINDS = ['0-10', '0-100', 'boolean'] as const
const DIRECTIONS = ['higher-is-better', 'lower-is-better'] as const

function parseScale(value: unknown, path: string): Scale {
  if (!isObject(value)) throw new ImportError(`Factor ${path} scale must be an object`)
  const kind = value.kind
  if (!SCALE_KINDS.includes(kind as (typeof SCALE_KINDS)[number])) {
    throw new ImportError(`Factor ${path} has an invalid scale kind: ${JSON.stringify(kind)}`)
  }
  return { kind } as Scale
}

function parseDirection(value: unknown, path: string): Direction {
  if (!DIRECTIONS.includes(value as Direction)) {
    throw new ImportError(`Factor ${path} has an invalid direction: ${JSON.stringify(value)}`)
  }
  return value as Direction
}

function parseFactor(value: unknown, index: number): Factor {
  if (!isObject(value)) throw new ImportError(`Factor at index ${index} must be an object`)
  const id = requireNonBlank(value.id, `factors[${index}].id`)
  const name = requireNonBlank(value.name, `factors[${index}].name`)
  const weight = requireFiniteNumber(value.weight, `factors[${index}].weight`)
  if (!(weight > 0)) throw new ImportError(`Factor "${name}" weight must be greater than 0`)
  const direction = parseDirection(value.direction, `"${name}"`)
  const scale = parseScale(value.scale, `"${name}"`)
  return { id, name, weight, direction, scale }
}

function parseAlternative(
  value: unknown,
  index: number,
  factorsById: Map<string, Factor>,
): Alternative {
  if (!isObject(value)) throw new ImportError(`Alternative at index ${index} must be an object`)
  const id = requireNonBlank(value.id, `alternatives[${index}].id`)
  const name = requireNonBlank(value.name, `alternatives[${index}].name`)
  const rawRatings = value.ratings
  if (!isObject(rawRatings)) {
    throw new ImportError(`Alternative "${name}" ratings must be an object`)
  }
  const ratings: Record<string, number> = {}
  for (const [factorId, rawValue] of Object.entries(rawRatings)) {
    const factor = factorsById.get(factorId)
    if (!factor) {
      throw new ImportError(
        `Alternative "${name}" has a rating for unknown factor id "${factorId}"`,
      )
    }
    const rating = requireFiniteNumber(rawValue, `alternatives[${index}].ratings["${factorId}"]`)
    const max = scaleMax(factor.scale)
    if (rating < 0 || rating > max) {
      throw new ImportError(
        `Alternative "${name}" rating ${rating} is outside [0, ${max}] for factor "${factor.name}"`,
      )
    }
    ratings[factorId] = rating
  }
  return { id, name, ratings }
}

function assertUniqueIds(ids: string[], label: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new ImportError(`Duplicate ${label} id: "${id}"`)
    seen.add(id)
  }
}

/**
 * Parse and validate an exported decision JSON string. Throws ImportError with
 * a descriptive message on any malformed or out-of-range input.
 */
export function importDecision(json: string): Decision {
  if (json.length > MAX_IMPORT_BYTES) {
    throw new ImportError(`Import is too large (${json.length} bytes; max ${MAX_IMPORT_BYTES})`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new ImportError('Input is not valid JSON')
  }

  if (!isObject(parsed)) throw new ImportError('Import must be a JSON object')
  if (parsed.schemaVersion !== DECISION_SCHEMA_VERSION) {
    throw new ImportError(
      `Unsupported schema version: ${JSON.stringify(parsed.schemaVersion)} (expected ${DECISION_SCHEMA_VERSION})`,
    )
  }

  const decision = parsed.decision
  if (!isObject(decision)) throw new ImportError('Import is missing the "decision" object')

  const id = requireNonBlank(decision.id, 'decision.id')
  const title = requireString(decision.title, 'decision.title')
  if (!Array.isArray(decision.factors)) throw new ImportError('decision.factors must be an array')
  if (!Array.isArray(decision.alternatives)) {
    throw new ImportError('decision.alternatives must be an array')
  }

  const factors = decision.factors.map(parseFactor)
  assertUniqueIds(
    factors.map((f) => f.id),
    'factor',
  )
  const factorsById = new Map(factors.map((f) => [f.id, f]))

  const alternatives = decision.alternatives.map((a, i) => parseAlternative(a, i, factorsById))
  assertUniqueIds(
    alternatives.map((a) => a.id),
    'alternative',
  )

  const result: Decision = { id, title, factors, alternatives }
  if (decision.description !== undefined) {
    result.description = requireString(decision.description, 'decision.description')
  }
  return result
}
