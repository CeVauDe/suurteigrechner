export type NumberFieldState = {
  value: number;
  constant: boolean;
  disableConst: boolean;
  disableNumber: boolean;
  unit: string;
  min: number;
  max: number;
}

export type Ingredient = NumberFieldState & {
  divident: number;
  calculate?: (state: CalculaterState, starterHydration: number) => number;
}

export type CalculaterState = {
  flour: Ingredient;
  water: Ingredient;
  starter: Ingredient;
  hydration: NumberFieldState;
  totalDough: NumberFieldState;
  starterHydration: NumberFieldState;
  counter: number;
}
