import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialCalculatorState } from './calculatorState';
import {
  saveCalculation,
  listSavedCalculations,
  loadSavedCalculation,
  overwriteSavedCalculation,
  renameSavedCalculation,
  deleteSavedCalculation,
  clearSavedCalculations,
} from './calculatorSaves';

class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

describe('calculatorSaves', () => {
  beforeEach(() => {
    (globalThis as any).window = {};
    (globalThis as any).localStorage = new LocalStorageMock();
    clearSavedCalculations();
  });

  it('creates and lists named saves', () => {
    const state = createInitialCalculatorState();
    state.flour.value = 1200;

    const saved = saveCalculation('Weekend loaf', state);
    const list = listSavedCalculations();

    expect(saved.name).toBe('Weekend loaf');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Weekend loaf');
  });

  it('loads saved calculation as runtime state', () => {
    const state = createInitialCalculatorState();
    state.starter.value = 320;

    const saved = saveCalculation('Starter boost', state);
    const loaded = loadSavedCalculation(saved.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.starter.value).toBe(320);
    expect(typeof loaded?.flour.calculate).toBe('function');
  });

  it('overwrites existing save by name when requested', () => {
    const state1 = createInitialCalculatorState();
    state1.flour.value = 1001;
    saveCalculation('Daily', state1);

    const state2 = createInitialCalculatorState();
    state2.flour.value = 1337;
    saveCalculation('Daily', state2, { overwrite: true });

    const list = listSavedCalculations();
    expect(list).toHaveLength(1);
    expect(list[0].snapshot.payload.flour.value).toBe(1337);
  });

  it('overwrites selected save by id while keeping its name', () => {
    const base = createInitialCalculatorState();
    const created = saveCalculation('Bake A', base);

    const next = createInitialCalculatorState();
    next.water.value = 777;

    const overwritten = overwriteSavedCalculation(created.id, next);
    expect(overwritten).not.toBeNull();
    expect(overwritten?.id).toBe(created.id);
    expect(overwritten?.name).toBe('Bake A');

    const loaded = loadSavedCalculation(created.id);
    expect(loaded?.water.value).toBe(777);
  });

  it('renames and deletes saves', () => {
    const state = createInitialCalculatorState();
    const saved = saveCalculation('Old Name', state);

    const renamed = renameSavedCalculation(saved.id, 'New Name');
    expect(renamed).toBe(true);
    expect(listSavedCalculations()[0].name).toBe('New Name');

    const deleted = deleteSavedCalculation(saved.id);
    expect(deleted).toBe(true);
    expect(listSavedCalculations()).toHaveLength(0);
  });

  it('does not rename when target name already exists', () => {
    const state = createInitialCalculatorState();
    const first = saveCalculation('First', state);
    saveCalculation('Second', state);

    const renamed = renameSavedCalculation(first.id, 'Second');

    expect(renamed).toBe(false);
    expect(listSavedCalculations().find((x) => x.id === first.id)?.name).toBe('First');
  });

  it('recovers from corrupted storage payload', () => {
    localStorage.setItem('suurteig_saved_calculations', '{invalid json');

    const list = listSavedCalculations();

    expect(list).toEqual([]);
    expect(localStorage.getItem('suurteig_saved_calculations')).toBe('[]');
  });
});
