import { describe, expect, it } from 'vitest'
import { calculateTotalDough } from './calc'
import { createInitialCalculatorState } from './calculatorState'
import { setFieldValueCase, setHydrationCase, setStarterHydrationCase, setTotalDoughCase } from './reducerHelpers'

describe('reducerHelpers salt-aware total dough', () => {
  it('setStarterHydrationCase recalculates totalDough', () => {
    const state = createInitialCalculatorState()

    const next = setStarterHydrationCase(state, 0)

    const expectedTotal = Math.round(calculateTotalDough(next, 0))
    expect(next.totalDough.value).toBe(expectedTotal)
  })

  it('setHydrationCase recomputes totalDough using current starter hydration', () => {
    const state = createInitialCalculatorState()
    state.starterHydration.value = 0

    const next = setHydrationCase(state, 70)

    const expectedTotal = Math.round(calculateTotalDough(next, state.starterHydration.value))
    expect(next.totalDough.value).toBe(expectedTotal)
  })

  it('setFieldValueCase recomputes totalDough using current starter hydration', () => {
    const state = createInitialCalculatorState()
    state.starterHydration.value = 0

    const next = setFieldValueCase(state, 'water', 670)

    const expectedTotal = Math.round(calculateTotalDough(next, state.starterHydration.value))
    expect(next.totalDough.value).toBe(expectedTotal)
  })

  it('setTotalDoughCase uses salt share from total flour in ratio scaling', () => {
    const state = createInitialCalculatorState()
    state.starterHydration.value = 0

    const next = setTotalDoughCase(state, 1000)

    const sH = state.starterHydration.value / 100
    const saltDivident = 0.02 * (state.flour.divident + (state.starter.divident * (1 / (1 + sH))))
    const totalDivident = state.flour.divident + state.water.divident + state.starter.divident + saltDivident
    const factor = 1000 / totalDivident

    const expectedFlour = Math.round(state.flour.divident * factor)
    const expectedWater = Math.round(state.water.divident * factor)
    const expectedStarter = Math.round(state.starter.divident * factor)

    expect(next.flour.value).toBe(expectedFlour)
    expect(next.water.value).toBe(expectedWater)
    expect(next.starter.value).toBe(expectedStarter)
  })
})
