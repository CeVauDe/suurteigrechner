import { describe, it, expect } from 'vitest'
import { createInitialCalculatorState } from './calculatorState'

describe('createInitialCalculatorState', () => {
  it('returns default calculator values and calculate handlers', () => {
    const state = createInitialCalculatorState()

    expect(state.flour.value).toBe(1000)
    expect(state.water.value).toBe(670)
    expect(state.starter.value).toBe(250)
    expect(state.hydration.value).toBe(71)
    expect(state.totalDough.value).toBe(1940)
    expect(state.starterHydration.value).toBe(100)
    expect(state.counter).toBe(0)

    expect(typeof state.flour.calculate).toBe('function')
    expect(typeof state.water.calculate).toBe('function')
    expect(typeof state.starter.calculate).toBe('function')
  })
})
