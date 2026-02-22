import type { CalculatorSnapshot, CalculaterState, SerializableCalculaterState } from './types';

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