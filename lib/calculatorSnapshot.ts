import type { CalculatorSnapshot, CalculaterState, SerializableCalculaterState } from './types';
import { createInitialCalculatorState } from './calculatorState';

export const CALCULATOR_SNAPSHOT_VERSION = 1;

function toSerializableIngredient(ingredient: CalculaterState['flour']) {
  const { calculate: _calculate, ...rest } = ingredient;
  return rest;
}

export function toSnapshot(state: CalculaterState): CalculatorSnapshot {
  const payload: SerializableCalculaterState = {
    flour: toSerializableIngredient(state.flour),
    water: toSerializableIngredient(state.water),
    starter: toSerializableIngredient(state.starter),
    hydration: { ...state.hydration },
    totalDough: { ...state.totalDough },
    starterHydration: { ...state.starterHydration },
    counter: state.counter
  };

  return {
    version: CALCULATOR_SNAPSHOT_VERSION,
    payload
  };
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidField(field: unknown): field is { value: number; constant: boolean; disableConst: boolean; disableNumber: boolean; unit: string; min: number; max?: number } {
  if (!field || typeof field !== 'object') return false;
  const candidate = field as Record<string, unknown>;
  return (
    isValidNumber(candidate.value) &&
    typeof candidate.constant === 'boolean' &&
    typeof candidate.disableConst === 'boolean' &&
    typeof candidate.disableNumber === 'boolean' &&
    typeof candidate.unit === 'string' &&
    isValidNumber(candidate.min) &&
    (candidate.max === undefined || isValidNumber(candidate.max))
  );
}

function isValidIngredient(field: unknown): field is SerializableCalculaterState['flour'] {
  if (!isValidField(field)) return false;
  const candidate = field as Record<string, unknown>;
  return isValidNumber(candidate.divident);
}

function isValidPayload(payload: unknown): payload is SerializableCalculaterState {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Record<string, unknown>;
  return (
    isValidIngredient(candidate.flour) &&
    isValidIngredient(candidate.water) &&
    isValidIngredient(candidate.starter) &&
    isValidField(candidate.hydration) &&
    isValidField(candidate.totalDough) &&
    isValidField(candidate.starterHydration) &&
    isValidNumber(candidate.counter)
  );
}

export function fromSnapshot(snapshot: CalculatorSnapshot): CalculaterState {
  const initial = createInitialCalculatorState();

  if (!snapshot || snapshot.version !== CALCULATOR_SNAPSHOT_VERSION) {
    return initial;
  }

  if (!isValidPayload(snapshot.payload)) {
    return initial;
  }

  return {
    flour: { ...snapshot.payload.flour, calculate: initial.flour.calculate },
    water: { ...snapshot.payload.water, calculate: initial.water.calculate },
    starter: { ...snapshot.payload.starter, calculate: initial.starter.calculate },
    hydration: { ...snapshot.payload.hydration },
    totalDough: { ...snapshot.payload.totalDough },
    starterHydration: { ...snapshot.payload.starterHydration },
    counter: snapshot.payload.counter
  };
}