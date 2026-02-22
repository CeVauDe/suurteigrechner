import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('calculator page salt usage', () => {
  it('uses calculateSalt helper and not direct flour*0.02 formula', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/calculator.tsx'), 'utf8')

    expect(source.includes('calculateSalt(')).toBe(true)
    expect(source.includes('flour * 0.02')).toBe(false)
    expect(source.includes('fields.flour.value * 0.02')).toBe(false)
  })
})
