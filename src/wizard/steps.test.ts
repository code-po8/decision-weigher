import { describe, expect, it } from 'vitest'
import {
  WIZARD_STEPS,
  STEP_PATHS,
  STEP_LABELS,
  stepIndex,
  isStepComplete,
  isStepReachable,
  furthestReachableStep,
  nextStep,
  previousStep,
} from './steps'
import type { Decision, Factor, Alternative } from '../domain/types'

const factor: Factor = { id: 'f', name: 'F', weight: 1, direction: 'higher-is-better', scale: { kind: '0-10' } }
const alt: Alternative = { id: 'a', name: 'A', ratings: {} }

function decision(overrides: Partial<Decision> = {}): Decision {
  return { id: 'd', title: '', factors: [], alternatives: [], ...overrides }
}

describe('step model', () => {
  it('has four ordered steps with paths and labels', () => {
    expect(WIZARD_STEPS).toEqual(['decision', 'factors', 'alternatives', 'results'])
    for (const step of WIZARD_STEPS) {
      expect(STEP_PATHS[step]).toBeTruthy()
      expect(STEP_LABELS[step]).toBeTruthy()
    }
  })

  it('reports step indices', () => {
    expect(stepIndex('decision')).toBe(0)
    expect(stepIndex('results')).toBe(3)
  })

  it('computes next/previous steps', () => {
    expect(nextStep('decision')).toBe('factors')
    expect(nextStep('results')).toBeNull()
    expect(previousStep('factors')).toBe('decision')
    expect(previousStep('decision')).toBeNull()
  })
})

describe('isStepComplete', () => {
  it('decision step needs a non-blank title', () => {
    expect(isStepComplete('decision', decision({ title: '' }))).toBe(false)
    expect(isStepComplete('decision', decision({ title: '   ' }))).toBe(false)
    expect(isStepComplete('decision', decision({ title: 'Car' }))).toBe(true)
  })

  it('factors step needs at least one factor', () => {
    expect(isStepComplete('factors', decision())).toBe(false)
    expect(isStepComplete('factors', decision({ factors: [factor] }))).toBe(true)
  })

  it('alternatives step needs at least one alternative', () => {
    expect(isStepComplete('alternatives', decision())).toBe(false)
    expect(isStepComplete('alternatives', decision({ alternatives: [alt] }))).toBe(true)
  })

  it('results step is always complete (terminal)', () => {
    expect(isStepComplete('results', decision())).toBe(true)
  })
})

describe('isStepReachable', () => {
  it('decision is always reachable', () => {
    expect(isStepReachable('decision', decision())).toBe(true)
  })

  it('factors requires a title', () => {
    expect(isStepReachable('factors', decision({ title: '' }))).toBe(false)
    expect(isStepReachable('factors', decision({ title: 'Car' }))).toBe(true)
  })

  it('alternatives requires title AND a factor', () => {
    expect(isStepReachable('alternatives', decision({ title: 'Car' }))).toBe(false)
    expect(isStepReachable('alternatives', decision({ title: 'Car', factors: [factor] }))).toBe(true)
  })

  it('results requires title AND a factor AND an alternative', () => {
    expect(
      isStepReachable('results', decision({ title: 'Car', factors: [factor] })),
    ).toBe(false)
    expect(
      isStepReachable('results', decision({ title: 'Car', factors: [factor], alternatives: [alt] })),
    ).toBe(true)
  })
})

describe('furthestReachableStep', () => {
  it('is decision for an empty decision', () => {
    expect(furthestReachableStep(decision())).toBe('decision')
  })

  it('advances as prerequisites are met', () => {
    expect(furthestReachableStep(decision({ title: 'Car' }))).toBe('factors')
    expect(furthestReachableStep(decision({ title: 'Car', factors: [factor] }))).toBe('alternatives')
    expect(
      furthestReachableStep(decision({ title: 'Car', factors: [factor], alternatives: [alt] })),
    ).toBe('results')
  })

  it('stops at the first unmet prerequisite even if later data exists', () => {
    // has alternatives but no title → still stuck at decision
    expect(furthestReachableStep(decision({ alternatives: [alt], factors: [factor] }))).toBe('decision')
  })
})
