import { describe, it, expect } from 'vitest';
import { createInitialCalculatorState } from './calculatorState';
import { toSnapshot, CALCULATOR_SNAPSHOT_VERSION } from './calculatorSnapshot';

describe('toSnapshot', () => {
  it('returns versioned serializable payload without function fields', () => {
    const state = createInitialCalculatorState();
    const snapshot = toSnapshot(state);

    expect(snapshot.version).toBe(CALCULATOR_SNAPSHOT_VERSION);
    expect(snapshot.payload.flour.value).toBe(1000);
    expect(snapshot.payload.water.value).toBe(670);
    expect(snapshot.payload.starter.value).toBe(250);
    expect(snapshot.payload.counter).toBe(0);

    expect('calculate' in (snapshot.payload.flour as Record<string, unknown>)).toBe(false);
    expect('calculate' in (snapshot.payload.water as Record<string, unknown>)).toBe(false);
    expect('calculate' in (snapshot.payload.starter as Record<string, unknown>)).toBe(false);
  });

  it('produces JSON-safe data', () => {
    const state = createInitialCalculatorState();
    const snapshot = toSnapshot(state);

    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });
});
