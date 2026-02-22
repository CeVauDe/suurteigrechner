import { CalculaterState, Ingredient } from './types';
import { calculateHydration, calculateTotalDough } from './calc';

export const IndrigentKeys = ['flour', 'water', 'starter'] as const;
export const CalcluaterKeys = ['flour', 'water', 'starter', 'hydration'] as const;

export function toggleConstCase(fields: CalculaterState, field: keyof CalculaterState) {
  const isConst = (fields as any)[field].constant;
  const nextCounter = isConst ? fields.counter - 1 : fields.counter + 1;
  let nextFields = { ...fields } as CalculaterState;

  if (nextCounter < 3) {
    for (let key of CalcluaterKeys) {
      const k = key as keyof CalculaterState;
      (nextFields as any)[k] = { ...(nextFields as any)[k], disableConst: false, disableNumber: false } as any;
    }
  } else if (nextCounter >= 3) {
    for (let key of CalcluaterKeys) {
      const k = key as keyof CalculaterState;
      if (!( (nextFields as any)[k].constant) && k !== field) {
        (nextFields as any)[k] = { ...(nextFields as any)[k], disableConst: true, disableNumber: true } as any;
      }
    }
  }

  (nextFields as any)[field] = { ...(nextFields as any)[field], constant: !isConst } as any;
  nextFields.counter = nextCounter;

  // if toggled is ingredient -> adjust totalDough disable state
  if ((fields[field] as any).divident !== undefined) {
    if (!isConst) {
      nextFields.totalDough = { ...nextFields.totalDough, disableNumber: true } as any;
      return nextFields;
    } else {
      let enableTotal = true;
      for (let key of IndrigentKeys) {
        const k = key as keyof CalculaterState;
        if ((nextFields as any)[k].constant) enableTotal = false;
      }
      if (enableTotal) nextFields.totalDough = { ...nextFields.totalDough, disableNumber: false } as any;
    }
  } else if (field === 'hydration') {
    // when hydration is toggled we need to disable starter hydration input
    (nextFields as any).starterHydration = { ...(nextFields as any).starterHydration, disableNumber: !isConst } as any;
    return nextFields;
  }

  return nextFields;
}

export function setHydrationCase(fields: CalculaterState, value: number) {
  const starterHydration = fields.starterHydration.value;
  const newFields = { ...fields, hydration: { ...fields.hydration, value } } as CalculaterState;
  for (let key of IndrigentKeys) {
    const k = key as keyof CalculaterState;
    const ing = (newFields as any)[k] as Ingredient;
    if (!ing.constant) {
      const factor = ing.value / ing.divident;
      const newValue = Math.round((ing.calculate as any)(newFields, starterHydration));
      (newFields as any)[k] = { ...ing, value: newValue, divident: newValue / factor } as Ingredient;
      break;
    }
  }
  newFields.totalDough = { ...newFields.totalDough, value: Math.round(calculateTotalDough(newFields, starterHydration)) } as any;
  return newFields;
}

export function setTotalDoughCase(fields: CalculaterState, newTotal: number) {
  const starterHydration = fields.starterHydration.value;
  let nextFields = { ...fields } as CalculaterState;
  nextFields.totalDough = { ...nextFields.totalDough, value: newTotal } as any;
  const sH = starterHydration / 100;
  const flourDivident = nextFields.flour.divident;
  const starterFlourDivident = nextFields.starter.divident * (1 / (1 + sH));
  const saltDivident = 0.02 * (flourDivident + starterFlourDivident);
  let totalDivident = saltDivident;
  for (let key of IndrigentKeys) {
    const k = key as keyof CalculaterState;
    totalDivident += ((nextFields as any)[k] as Ingredient).divident;
  }
  const factor = newTotal / totalDivident;
  for (let key of IndrigentKeys) {
    const k = key as keyof CalculaterState;
    const ing = (nextFields as any)[k] as Ingredient;
    const newValue = Math.round(ing.divident * factor);
    (nextFields as any)[k] = { ...ing, value: newValue } as Ingredient;
  }
  nextFields.hydration = { ...nextFields.hydration, value: Math.round(calculateHydration(nextFields, starterHydration)) } as any;
  nextFields.counter = nextFields.counter; // no-op but keep counter
  return nextFields;
}

export function setStarterHydrationCase(fields: CalculaterState, newStarter: number) {
  const newHydration = Math.round(calculateHydration(fields, newStarter));
  const newTotalDough = Math.round(calculateTotalDough(fields, newStarter));
  const nextFields = {
    ...fields,
    starterHydration: { ...fields.starterHydration, value: newStarter },
    hydration: { ...fields.hydration, value: newHydration },
    totalDough: { ...fields.totalDough, value: newTotalDough }
  } as CalculaterState;
  return nextFields;
}

export function setFieldValueCase(fields: CalculaterState, field: keyof CalculaterState, value: number) {
  const starterHydration = fields.starterHydration.value;
  let nextFields = { ...fields } as CalculaterState;
  (nextFields as any)[field] = { ...(fields as any)[field], value };

  if (fields.counter === 0 && (IndrigentKeys as readonly string[]).includes(field as string)) {
    const changed = (nextFields as any)[field] as Ingredient;
    const factor = value / changed.divident;
    for (let key of IndrigentKeys) {
      const k = key as keyof CalculaterState;
      if (k !== field) {
        const ing = (nextFields as any)[k] as Ingredient;
        (nextFields as any)[k] = { ...ing, value: Math.round(ing.divident * factor) } as Ingredient;
      }
    }
  } else {
    for (let key of IndrigentKeys) {
      const k = key as keyof CalculaterState;
      if (k !== field && !((nextFields as any)[k] as Ingredient).constant) {
        const ing = (nextFields as any)[k] as Ingredient;
        const factor = ing.value / ing.divident;
        const projected = { ...nextFields } as CalculaterState;
        const newVal = Math.round((ing.calculate as any)(projected, starterHydration));
        (nextFields as any)[k] = { ...ing, value: newVal, divident: newVal / factor } as Ingredient;
        break;
      }
    }
  }
  nextFields.hydration = { ...nextFields.hydration, value: Math.round(calculateHydration(nextFields, starterHydration)) } as any;
  nextFields.totalDough = { ...nextFields.totalDough, value: Math.round(calculateTotalDough(nextFields, starterHydration)) } as any;
  return nextFields;
}
