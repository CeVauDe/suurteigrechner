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

export interface LocalReminder {
  id: number           // Server-side reminder ID
  scheduledTime: string // ISO datetime string
  message: string       // The notification message
  createdAt: string     // ISO datetime when reminder was created
}
