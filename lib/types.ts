export type NumberFieldState = {
  value: number;
  constant: boolean;
  disableConst: boolean;
  disableNumber: boolean;
  unit: string;
  min: number;
  max?: number;
}

export type Ingredient = NumberFieldState & {
  divident: number;
  calculate?: (state: CalculaterState, starterHydration: number) => number;
}

export type SerializableIngredient = Omit<Ingredient, 'calculate'>;

export type SerializableCalculaterState = {
  flour: SerializableIngredient;
  water: SerializableIngredient;
  starter: SerializableIngredient;
  hydration: NumberFieldState;
  totalDough: NumberFieldState;
  starterHydration: NumberFieldState;
  counter: number;
}

export type CalculatorSnapshot = {
  version: number;
  payload: SerializableCalculaterState;
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

// Reminder types and constants
export const MAX_REMINDERS = 10

export const RECURRENCE_OPTIONS: { hours: number | null; label: string }[] = [
  { hours: null, label: 'Einmal' },
  { hours: 24, label: 'Täglich' },
  { hours: 48, label: 'Alli 2 Täg' },
  { hours: 168, label: 'Wöchentlich' },
]

export interface LocalReminder {
  id: number                              // Server-side reminder ID
  scheduledTime: string                   // ISO datetime string
  message: string                         // The notification message
  createdAt: string                       // ISO datetime when reminder was created
  recurrenceIntervalHours: number | null  // null = one-time, 24/48/168 = recurring
  endDate?: string                        // ISO datetime when recurring reminder ends
}
