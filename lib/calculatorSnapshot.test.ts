import { describe, it, expect } from 'vitest';
import { createInitialCalculatorState } from './calculatorState';
import { toSnapshot, fromSnapshot, CALCULATOR_SNAPSHOT_VERSION } from './calculatorSnapshot';

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

describe('fromSnapshot', () => {
  it('restores state values and reattaches calculate handlers', () => {
    const state = createInitialCalculatorState();
    state.flour.value = 1100;
    state.water.constant = true;
    state.counter = 1;

    const snapshot = toSnapshot(state);
    const restored = fromSnapshot(snapshot);

    expect(restored.flour.value).toBe(1100);
    expect(restored.water.constant).toBe(true);
    expect(restored.counter).toBe(1);

    expect(typeof restored.flour.calculate).toBe('function');
    expect(typeof restored.water.calculate).toBe('function');
    expect(typeof restored.starter.calculate).toBe('function');
  });

  it('falls back to initial state for invalid snapshots', () => {
    const restored = fromSnapshot({ version: 999, payload: {} as any });
    const initial = createInitialCalculatorState();

    expect(restored.flour.value).toBe(initial.flour.value);
    expect(restored.water.value).toBe(initial.water.value);
    expect(restored.starter.value).toBe(initial.starter.value);
    expect(restored.counter).toBe(initial.counter);
    expect(typeof restored.flour.calculate).toBe('function');
  });
});
