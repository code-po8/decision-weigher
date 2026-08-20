// Thin browser wrappers around the pure DW-003 serialization: trigger a file
// download of the current decision, and read a picked File back into a decision.
// The validation/serialization logic lives in ../domain/serialization; this
// module only bridges to the DOM File APIs so the rest of the app stays pure.

import type { Decision } from '../domain/types'
import { exportDecision, importDecision } from '../domain/serialization'

/** A filesystem-safe file name derived from the decision title. */
export function decisionFileName(decision: Decision): string {
  const base = decision.title.trim() || 'decision'
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'decision'}.json`
}

/** Trigger a browser download of the decision as a JSON file. */
export function downloadDecision(
  decision: Decision,
  doc: Document = document,
): void {
  const json = exportDecision(decision)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = doc.createElement('a')
  a.href = url
  a.download = decisionFileName(decision)
  doc.body.appendChild(a)
  a.click()
  doc.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Read a picked File and parse+validate it into a Decision (throws ImportError). */
export async function readDecisionFile(file: File): Promise<Decision> {
  const text = await file.text()
  return importDecision(text)
}
