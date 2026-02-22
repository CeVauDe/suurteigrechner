import { fromSnapshot, toSnapshot } from './calculatorSnapshot';
import type { CalculaterState, CalculatorSnapshot } from './types';

const SAVED_CALCULATIONS_KEY = 'suurteig_saved_calculations';

export type SavedCalculation = {
  id: string;
  name: string;
  snapshot: CalculatorSnapshot;
  createdAt: string;
  updatedAt: string;
};

type SaveOptions = {
  overwrite?: boolean;
};

export type SavedCalculationsReadResult = {
  entries: SavedCalculation[];
  recoveredFromCorruption: boolean;
};

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function persist(items: SavedCalculation[]) {
  if (!hasWindow()) return;
  localStorage.setItem(SAVED_CALCULATIONS_KEY, JSON.stringify(items));
}

function parseStored(): SavedCalculationsReadResult {
  if (!hasWindow()) {
    return { entries: [], recoveredFromCorruption: false };
  }

  const raw = localStorage.getItem(SAVED_CALCULATIONS_KEY);
  if (!raw) {
    return { entries: [], recoveredFromCorruption: false };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      persist([]);
      return { entries: [], recoveredFromCorruption: true };
    }

    return { entries: parsed as SavedCalculation[], recoveredFromCorruption: false };
  } catch {
    persist([]);
    return { entries: [], recoveredFromCorruption: true };
  }
}

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

export function listSavedCalculations(): SavedCalculation[] {
  return parseStored().entries;
}

export function listSavedCalculationsWithStatus(): SavedCalculationsReadResult {
  return parseStored();
}

export function saveCalculation(name: string, state: CalculaterState, options: SaveOptions = {}): SavedCalculation {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Name is required');
  }
  const now = new Date().toISOString();
  const snapshot = toSnapshot(state);
  const existing = parseStored().entries;
  const existingIndex = existing.findIndex((entry) => normalizedName(entry.name) === normalizedName(trimmedName));

  if (existingIndex >= 0 && options.overwrite) {
    const updated: SavedCalculation = {
      ...existing[existingIndex],
      name: trimmedName,
      snapshot,
      updatedAt: now
    };
    const next = [...existing];
    next[existingIndex] = updated;
    persist(next);
    return updated;
  }

  const created: SavedCalculation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: trimmedName,
    snapshot,
    createdAt: now,
    updatedAt: now
  };

  persist([...existing, created]);
  return created;
}

export function loadSavedCalculation(id: string): CalculaterState | null {
  const existing = parseStored().entries;
  const found = existing.find((entry) => entry.id === id);
  if (!found) return null;
  return fromSnapshot(found.snapshot);
}

export function overwriteSavedCalculation(id: string, state: CalculaterState): SavedCalculation | null {
  const existing = parseStored().entries;
  const index = existing.findIndex((entry) => entry.id === id);
  if (index < 0) return null;

  const updated: SavedCalculation = {
    ...existing[index],
    snapshot: toSnapshot(state),
    updatedAt: new Date().toISOString()
  };

  const next = [...existing];
  next[index] = updated;
  persist(next);
  return updated;
}

export function renameSavedCalculation(id: string, newName: string): boolean {
  const trimmedName = newName.trim();
  if (!trimmedName) return false;

  const existing = parseStored().entries;
  const index = existing.findIndex((entry) => entry.id === id);
  if (index < 0) return false;

  const collides = existing.some((entry) => entry.id !== id && normalizedName(entry.name) === normalizedName(trimmedName));
  if (collides) return false;

  existing[index] = {
    ...existing[index],
    name: trimmedName,
    updatedAt: new Date().toISOString()
  };
  persist(existing);
  return true;
}

export function deleteSavedCalculation(id: string): boolean {
  const existing = parseStored().entries;
  const next = existing.filter((entry) => entry.id !== id);
  if (next.length === existing.length) return false;
  persist(next);
  return true;
}

export function clearSavedCalculations(): void {
  persist([]);
}
