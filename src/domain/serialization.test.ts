import { describe, expect, it } from 'vitest'
import {
  DECISION_SCHEMA_VERSION,
  exportDecision,
  importDecision,
  MAX_IMPORT_BYTES,
  ImportError,
} from './serialization'
import type { Decision } from './types'

function sampleDecision(): Decision {
  return {
    id: 'd1',
    title: 'Choose a car',
    description: 'EV shortlist',
    factors: [
      { id: 'cost', name: 'Cost', weight: 5, direction: 'lower-is-better', scale: { kind: '0-100' } },
      { id: 'rel', name: 'Reliability', weight: 5, direction: 'higher-is-better', scale: { kind: '0-10' } },
      { id: 'nacs', name: 'NACS', weight: 2, direction: 'higher-is-better', scale: { kind: 'boolean' } },
    ],
    alternatives: [
      { id: 'm3', name: 'Model 3', ratings: { cost: 45, rel: 8, nacs: 1 } },
      { id: 'leaf', name: 'Leaf', ratings: { cost: 30, rel: 7, nacs: 0 } },
    ],
  }
}

/** Build a valid export envelope, then apply an override to the decision for negative tests. */
function envelopeWith(mutate: (d: Decision) => void): string {
  const d = sampleDecision()
  mutate(d)
  return JSON.stringify({ schemaVersion: DECISION_SCHEMA_VERSION, decision: d })
}

describe('exportDecision', () => {
  it('produces JSON with a schema version and the decision', () => {
    const json = exportDecision(sampleDecision())
    const parsed = JSON.parse(json)
    expect(parsed.schemaVersion).toBe(DECISION_SCHEMA_VERSION)
    expect(parsed.decision.title).toBe('Choose a car')
  })

  it('is pretty-printed (human readable)', () => {
    expect(exportDecision(sampleDecision())).toContain('\n')
  })
})

describe('round trip', () => {
  it('importDecision(exportDecision(d)) deep-equals d', () => {
    const d = sampleDecision()
    expect(importDecision(exportDecision(d))).toEqual(d)
  })

  it('round-trips a decision with no description', () => {
    const d = sampleDecision()
    delete d.description
    expect(importDecision(exportDecision(d))).toEqual(d)
  })

  it('round-trips an empty decision', () => {
    const d: Decision = { id: 'empty', title: '', factors: [], alternatives: [] }
    expect(importDecision(exportDecision(d))).toEqual(d)
  })
})

describe('importDecision — rejects malformed input', () => {
  it('throws ImportError with a specific message on non-JSON', () => {
    expect(() => importDecision('not json {')).toThrow(ImportError)
    expect(() => importDecision('not json {')).toThrow('Input is not valid JSON')
  })

  it('throws "Import must be a JSON object" on a JSON value that is not an object', () => {
    for (const nonObject of ['42', 'null', '"a string"', '[]']) {
      expect(() => importDecision(nonObject)).toThrow('Import must be a JSON object')
    }
  })

  it('throws on a missing or wrong schema version', () => {
    expect(() => importDecision(JSON.stringify({ decision: sampleDecision() }))).toThrow(
      /Unsupported schema version/,
    )
    expect(() =>
      importDecision(JSON.stringify({ schemaVersion: 999, decision: sampleDecision() })),
    ).toThrow(/Unsupported schema version: 999/)
  })

  it('throws "missing the decision object" when the decision payload is missing', () => {
    expect(() =>
      importDecision(JSON.stringify({ schemaVersion: DECISION_SCHEMA_VERSION })),
    ).toThrow('Import is missing the "decision" object')
  })

  it('throws when a top-level decision field has the wrong type', () => {
    expect(() => importDecision(envelopeWith((d) => ((d as unknown as { title: number }).title = 5)))).toThrow(
      'Field "decision.title" must be a string',
    )
    expect(() =>
      importDecision(envelopeWith((d) => ((d as unknown as { factors: unknown }).factors = 'x'))),
    ).toThrow('decision.factors must be an array')
    expect(() =>
      importDecision(
        envelopeWith((d) => ((d as unknown as { alternatives: unknown }).alternatives = {})),
      ),
    ).toThrow('decision.alternatives must be an array')
    expect(() => importDecision(envelopeWith((d) => ((d as unknown as { id: number }).id = 1)))).toThrow(
      'Field "decision.id" must be a string',
    )
  })
})

describe('importDecision — validates factors', () => {
  it('rejects a factor with weight <= 0 (message names the factor)', () => {
    expect(() => importDecision(envelopeWith((d) => (d.factors[0]!.weight = 0)))).toThrow(
      'Factor "Cost" weight must be greater than 0',
    )
    expect(() => importDecision(envelopeWith((d) => (d.factors[0]!.weight = -1)))).toThrow(
      'Factor "Cost" weight must be greater than 0',
    )
  })

  it('rejects a non-numeric weight', () => {
    expect(() =>
      importDecision(envelopeWith((d) => ((d.factors[0] as unknown as { weight: string }).weight = '5'))),
    ).toThrow('Field "factors[0].weight" must be a finite number')
  })

  it('rejects NaN / Infinity weight (JSON encodes them as null → non-number)', () => {
    // JSON.stringify(NaN) and JSON.stringify(Infinity) both serialize to null,
    // so on import these arrive as null and are rejected as non-numbers.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const json = envelopeWith((d) => (d.factors[0]!.weight = bad))
      expect(JSON.parse(json).decision.factors[0].weight).toBeNull() // documents the encoding
      expect(() => importDecision(json)).toThrow('Field "factors[0].weight" must be a finite number')
    }
  })

  it('rejects a blank factor name', () => {
    expect(() => importDecision(envelopeWith((d) => (d.factors[0]!.name = '   ')))).toThrow(
      'Field "factors[0].name" must not be blank',
    )
  })

  it('rejects an invalid scale kind (message names the factor and the bad kind)', () => {
    expect(() =>
      importDecision(
        envelopeWith((d) => ((d.factors[0]! as unknown as { scale: unknown }).scale = { kind: '0-5' })),
      ),
    ).toThrow('Factor "Cost" has an invalid scale kind: "0-5"')
  })

  it('rejects an invalid direction (message names the factor and the bad direction)', () => {
    expect(() =>
      importDecision(
        envelopeWith(
          (d) => ((d.factors[0]! as unknown as { direction: string }).direction = 'sideways'),
        ),
      ),
    ).toThrow('Factor "Cost" has an invalid direction: "sideways"')
  })

  it('rejects duplicate factor ids (naming "factor")', () => {
    expect(() => importDecision(envelopeWith((d) => (d.factors[1]!.id = d.factors[0]!.id)))).toThrow(
      /Duplicate factor id: "cost"/,
    )
  })
})

describe('importDecision — validates alternatives & ratings', () => {
  it('rejects a blank alternative name', () => {
    expect(() => importDecision(envelopeWith((d) => (d.alternatives[0]!.name = '')))).toThrow(
      'Field "alternatives[0].name" must not be blank',
    )
  })

  it('rejects duplicate alternative ids (naming "alternative")', () => {
    expect(() =>
      importDecision(envelopeWith((d) => (d.alternatives[1]!.id = d.alternatives[0]!.id))),
    ).toThrow(/Duplicate alternative id: "m3"/)
  })

  it('rejects a rating that is not a finite number', () => {
    expect(() =>
      importDecision(
        envelopeWith((d) => ((d.alternatives[0]!.ratings as Record<string, unknown>).cost = 'high')),
      ),
    ).toThrow('Field "alternatives[0].ratings["cost"]" must be a finite number')
  })

  it('rejects a rating outside the factor scale (message names alt, value, bound, factor)', () => {
    expect(() => importDecision(envelopeWith((d) => (d.alternatives[0]!.ratings.cost = 150)))).toThrow(
      'Alternative "Model 3" rating 150 is outside [0, 100] for factor "Cost"',
    )
    expect(() => importDecision(envelopeWith((d) => (d.alternatives[0]!.ratings.cost = -1)))).toThrow(
      'Alternative "Model 3" rating -1 is outside [0, 100] for factor "Cost"',
    )
  })

  it('accepts a rating exactly at the scale bounds (0 and max)', () => {
    expect(importDecision(envelopeWith((d) => (d.alternatives[0]!.ratings.cost = 0))).alternatives[0]!.ratings.cost).toBe(0)
    expect(importDecision(envelopeWith((d) => (d.alternatives[0]!.ratings.cost = 100))).alternatives[0]!.ratings.cost).toBe(100)
  })

  it('rejects a rating referencing an unknown factor id (message names alt and id)', () => {
    expect(() =>
      importDecision(envelopeWith((d) => (d.alternatives[0]!.ratings.ghost = 5))),
    ).toThrow('Alternative "Model 3" has a rating for unknown factor id "ghost"')
  })

  it('accepts an alternative with no ratings', () => {
    const json = envelopeWith((d) => (d.alternatives[0]!.ratings = {}))
    expect(importDecision(json).alternatives[0]!.ratings).toEqual({})
  })

  it('rejects a ratings field that is not an object', () => {
    expect(() =>
      importDecision(
        envelopeWith((d) => ((d.alternatives[0]! as unknown as { ratings: unknown }).ratings = [])),
      ),
    ).toThrow('Alternative "Model 3" ratings must be an object')
    expect(() =>
      importDecision(
        envelopeWith((d) => ((d.alternatives[0]! as unknown as { ratings: unknown }).ratings = 5)),
      ),
    ).toThrow('Alternative "Model 3" ratings must be an object')
  })

  it('rejects a blank alternative id', () => {
    expect(() => importDecision(envelopeWith((d) => (d.alternatives[0]!.id = '')))).toThrow(
      'Field "alternatives[0].id" must not be blank',
    )
  })

  it('rejects a blank factor id', () => {
    expect(() => importDecision(envelopeWith((d) => (d.factors[0]!.id = '  ')))).toThrow(
      'Field "factors[0].id" must not be blank',
    )
  })

  it('rejects a non-string description', () => {
    expect(() =>
      importDecision(envelopeWith((d) => ((d as unknown as { description: number }).description = 7))),
    ).toThrow('Field "decision.description" must be a string')
  })

  it('rejects a non-object factor entry and a non-object alternative entry', () => {
    expect(() =>
      importDecision(envelopeWith((d) => ((d.factors as unknown[])[0] = 'nope'))),
    ).toThrow('Factor at index 0 must be an object')
    expect(() =>
      importDecision(envelopeWith((d) => ((d.alternatives as unknown[])[0] = 42))),
    ).toThrow('Alternative at index 0 must be an object')
  })

  it('rejects a non-object scale', () => {
    expect(() =>
      importDecision(
        envelopeWith((d) => ((d.factors[0]! as unknown as { scale: unknown }).scale = 'boolean')),
      ),
    ).toThrow('Factor "Cost" scale must be an object')
  })
})

describe('importDecision — rejects oversized input', () => {
  it('throws a size error when the input exceeds the byte cap', () => {
    const huge = 'x'.repeat(MAX_IMPORT_BYTES + 1)
    expect(() => importDecision(huge)).toThrow(/too large/i)
  })

  it('does NOT throw a size error at exactly the byte cap (boundary is strict >)', () => {
    // Exactly MAX bytes: the size guard (json.length > MAX) must pass, so the
    // failure comes from JSON parsing instead — proving the boundary is `>`,
    // not `>=`.
    const atCap = 'x'.repeat(MAX_IMPORT_BYTES)
    expect(atCap.length).toBe(MAX_IMPORT_BYTES)
    expect(() => importDecision(atCap)).toThrow('Input is not valid JSON')
  })

  it('accepts a valid decision comfortably under the byte cap', () => {
    const json = exportDecision(sampleDecision())
    expect(json.length).toBeLessThanOrEqual(MAX_IMPORT_BYTES)
    expect(() => importDecision(json)).not.toThrow()
  })
})

describe('ImportError', () => {
  it('is an Error subclass with a name', () => {
    const err = new ImportError('boom')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ImportError')
    expect(err.message).toBe('boom')
  })
})
