import { calculateFlour, calculateStarter, calculateWater } from './calc';
import type { CalculaterState } from './types';

export function createInitialCalculatorState(): CalculaterState {
  return {
    flour: { value: 1000, min: 0, divident: 100, calculate: calculateFlour, unit: 'g', constant: false, disableConst: false, disableNumber: false },
    water: { value: 670, min: 0, divident: 67, calculate: calculateWater, unit: 'g', constant: false, disableConst: false, disableNumber: false },
    starter: { value: 250, min: 0, divident: 25, calculate: calculateStarter, unit: 'g', constant: false, disableConst: false, disableNumber: false },
    hydration: { value: 71, min: 0, max: 100, unit: '%', constant: false, disableConst: false, disableNumber: false },
    totalDough: { value: 1940, min: 0, unit: 'g', constant: false, disableConst: false, disableNumber: false },
    starterHydration: { value: 100, min: 0, max: 100, unit: '%', constant: false, disableConst: false, disableNumber: false },
    counter: 0
  };
}