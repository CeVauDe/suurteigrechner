import { describe, expect, it } from 'vitest'
import * as calc from './calc'

describe('calc salt and total dough', () => {
  it('exposes calculateSalt helper', () => {
    expect(typeof (calc as any).calculateSalt).toBe('function')
  })

  it('calculates total dough using salt from total flour (includes starter flour)', () => {
    const state = {
      flour: { value: 500 },
      water: { value: 100 },
      starter: { value: 200 },
      hydration: { value: 70 }
    }

    // starterHydration = 100% -> starter flour = 100g
    // total flour = 500 + 100 = 600g
    // salt = 12g
    // total dough = 500 + 100 + 200 + 12 = 812g
    const total = calc.calculateTotalDough(state as any)
    expect(total).toBeCloseTo(812)
  })
})
