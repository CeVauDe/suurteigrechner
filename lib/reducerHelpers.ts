import { CalculaterState, Ingredient, NumberFieldState } from './types';
import { calculateHydration, calculateTotalDough } from './calc';

export const IndrigentKeys = ['flour', 'water', 'starter'] as const;
export const CalcluaterKeys = ['flour', 'water', 'starter', 'hydration'] as const;
type IndrigentKey = typeof IndrigentKeys[number];
type CalcluaterKey = typeof CalcluaterKeys[number];

export function toggleConstCase(fields: CalculaterState, field: keyof CalculaterState) {
  const fieldVal = fields[field];
  const isConst = typeof fieldVal === 'object' && 'constant' in fieldVal ? (fieldVal as { constant?: boolean }).constant ?? false : false;
  const nextCounter = isConst ? fields.counter - 1 : fields.counter + 1;
  let nextFields = { ...fields } as CalculaterState;

  if (nextCounter < 3) {
    for (const k of CalcluaterKeys as readonly CalcluaterKey[]) {
      if (k === 'hydration') {
        const cur = nextFields[k] as NumberFieldState;
        nextFields[k] = { ...cur, disableConst: false, disableNumber: false } as NumberFieldState;
      } else {
        const cur = nextFields[k] as Ingredient;
        nextFields[k] = { ...cur, disableConst: false, disableNumber: false } as Ingredient;
      }
    }
  } else if (nextCounter >= 3) {
    for (const k of CalcluaterKeys as readonly CalcluaterKey[]) {
      if (k === 'hydration') {
        const cur = nextFields[k] as NumberFieldState;
        if (!cur.constant && k !== (field as CalcluaterKey)) {
          nextFields[k] = { ...cur, disableConst: true, disableNumber: true } as NumberFieldState;
        }
      } else {
        const cur = nextFields[k] as Ingredient;
        if (!cur.constant && k !== (field as CalcluaterKey)) {
          nextFields[k] = { ...cur, disableConst: true, disableNumber: true } as Ingredient;
        }
      }
    }
  }

  // only update object fields (ingredients/hydration)
  if (typeof nextFields[field] === 'object') {
    const cur = nextFields[field] as NumberFieldState | Ingredient;
    (nextFields as any)[field] = { ...cur, constant: !isConst } as typeof cur;
  }
  nextFields.counter = nextCounter;

  // if toggled is ingredient -> adjust totalDough disable state
  if (typeof fields[field] === 'object' && 'divident' in (fields[field] as any)) {
    if (!isConst) {
      nextFields.totalDough = { ...nextFields.totalDough, disableNumber: true };
      return nextFields;
    } else {
      let enableTotal = true;
      for (const k of IndrigentKeys as readonly IndrigentKey[]) {
        const cur = nextFields[k] as Ingredient;
        if (cur.constant) enableTotal = false;
      }
      if (enableTotal) nextFields.totalDough = { ...nextFields.totalDough, disableNumber: false };
    }
  } else if (field === 'hydration') {
    // when hydration is toggled we need to disable starter hydration input
    nextFields = { ...nextFields, starterHydration: { ...nextFields.starterHydration, disableNumber: !isConst } } as CalculaterState;
    return nextFields;
  }

  return nextFields;
}

export function setHydrationCase(fields: CalculaterState, value: number) {
  const starterHydration = fields.starterHydration.value;
  const newFields = { ...fields, hydration: { ...fields.hydration, value } } as CalculaterState;
  for (const k of IndrigentKeys as readonly IndrigentKey[]) {
    const ing = newFields[k] as Ingredient;
    if (!ing.constant) {
      const factor = ing.value / ing.divident;
      const newValue = Math.round((ing.calculate as any)(newFields, starterHydration));
      newFields[k] = { ...ing, value: newValue, divident: newValue / factor } as Ingredient;
      break;
    }
  }
  newFields.totalDough = { ...newFields.totalDough, value: Math.round(calculateTotalDough(newFields)) };
  return newFields;
}

export function setTotalDoughCase(fields: CalculaterState, newTotal: number) {
  const starterHydration = fields.starterHydration.value;
  let nextFields = { ...fields } as CalculaterState;
  nextFields.totalDough = { ...nextFields.totalDough, value: newTotal };
  let totalDivident = 2;
  for (const k of IndrigentKeys as readonly IndrigentKey[]) {
    totalDivident += (nextFields[k] as Ingredient).divident;
  }
  const factor = newTotal / totalDivident;
  for (const k of IndrigentKeys as readonly IndrigentKey[]) {
    const ing = nextFields[k] as Ingredient;
    const newValue = Math.round(ing.divident * factor);
    nextFields[k] = { ...ing, value: newValue } as Ingredient;
  }
  nextFields.hydration = { ...nextFields.hydration, value: Math.round(calculateHydration(nextFields, starterHydration)) };
  return nextFields;
}

export function setStarterHydrationCase(fields: CalculaterState, newStarter: number) {
  const newHydration = Math.round(calculateHydration(fields, newStarter));
  const nextFields = { ...fields, starterHydration: { ...fields.starterHydration, value: newStarter }, hydration: { ...fields.hydration, value: newHydration } } as CalculaterState;
  return nextFields;
}

export function setFieldValueCase(fields: CalculaterState, field: keyof CalculaterState, value: number) {
  const starterHydration = fields.starterHydration.value;
  let nextFields = { ...fields } as CalculaterState;
  // update the specific field (only object fields expected here)
  if (typeof fields[field] === 'object') {
    const cur = fields[field] as any;
    nextFields = { ...nextFields, [field]: { ...cur, value } } as CalculaterState;
  }

    if (fields.counter === 0 && (IndrigentKeys as readonly string[]).includes(field as string)) {
    const changed = nextFields[field] as Ingredient;
    const factor = value / changed.divident;
    for (const k of IndrigentKeys as readonly IndrigentKey[]) {
      if (k !== (field as IndrigentKey)) {
        const ing = nextFields[k] as Ingredient;
        nextFields[k] = { ...ing, value: Math.round(ing.divident * factor) } as Ingredient;
      }
    }
  } else {
    for (const k of IndrigentKeys as readonly IndrigentKey[]) {
      if (k !== (field as IndrigentKey) && !(nextFields[k] as Ingredient).constant) {
        const ing = nextFields[k] as Ingredient;
        const factor = ing.value / ing.divident;
        const projected = { ...nextFields } as CalculaterState;
        const newVal = Math.round((ing.calculate as any)(projected, starterHydration));
        nextFields[k] = { ...ing, value: newVal, divident: newVal / factor } as Ingredient;
        break;
      }
    }
  }
  nextFields.hydration = { ...nextFields.hydration, value: Math.round(calculateHydration(nextFields, starterHydration)) };
  nextFields.totalDough = { ...nextFields.totalDough, value: Math.round(calculateTotalDough(nextFields)) };
  return nextFields;
}
