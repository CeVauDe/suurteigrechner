import { CalculaterState, Ingredient } from './types';
import { calculateHydration, calculateTotalDough } from './calc';

export const IndrigentKeys: Array<keyof CalculaterState> = ['flour', 'water', 'starter'];
export const CalcluaterKeys: Array<keyof CalculaterState | 'hydration'> = ['flour', 'water', 'starter', 'hydration'];

export function toggleConstCase(fields: CalculaterState, field: keyof CalculaterState, counter: number) {
  const isConst = fields[field].constant;
  const nextCounter = isConst ? counter - 1 : counter + 1;
  let nextFields = { ...fields } as CalculaterState;

  if (nextCounter < 3) {
    for (let key of CalcluaterKeys) {
      const k = key as keyof CalculaterState;
      nextFields[k] = { ...nextFields[k], disableConst: false, disableNumber: false } as any;
    }
  } else if (nextCounter >= 3) {
    for (let key of CalcluaterKeys) {
      const k = key as keyof CalculaterState;
      if (!nextFields[k].constant && k !== field) {
        nextFields[k] = { ...nextFields[k], disableConst: true, disableNumber: true } as any;
      }
    }
  }

  nextFields[field] = { ...nextFields[field], constant: !isConst } as any;

  // if toggled is ingredient -> adjust totalDough disable state
  if ((fields[field] as any).divident !== undefined) {
    if (!isConst) {
      nextFields.totalDough = { ...nextFields.totalDough, disableNumber: true } as any;
      return { nextFields, nextCounter };
    } else {
      let enableTotal = true;
      for (let key of IndrigentKeys) {
        const k = key as keyof CalculaterState;
        if (nextFields[k].constant) enableTotal = false;
      }
      if (enableTotal) nextFields.totalDough = { ...nextFields.totalDough, disableNumber: false } as any;
    }
  } else if (field === 'hydration') {
    // when hydration is toggled we need to disable starter hydration input
    return { nextFields, nextCounter, disableStarterHyd: !isConst };
  }

  return { nextFields, nextCounter };
}

export function setHydrationCase(fields: CalculaterState, value: number, starterHydration: number) {
  const newFields = { ...fields, hydration: { ...fields.hydration, value } } as CalculaterState;
  for (let key of IndrigentKeys) {
    const k = key as keyof CalculaterState;
    const ing = newFields[k] as Ingredient;
    if (!ing.constant) {
      const factor = ing.value / ing.divident;
      const newValue = Math.round((ing.calculate as any)(newFields, starterHydration));
      newFields[k] = { ...ing, value: newValue, divident: newValue / factor } as Ingredient;
      break;
    }
  }
  newFields.totalDough = { ...newFields.totalDough, value: Math.round(calculateTotalDough(newFields)) } as any;
  return newFields;
}

export function setTotalDoughCase(fields: CalculaterState, newTotal: number, starterHydration: number) {
  let nextFields = { ...fields } as CalculaterState;
  nextFields.totalDough = { ...nextFields.totalDough, value: newTotal } as any;
  let totalDivident = 2;
  for (let key of IndrigentKeys) {
    const k = key as keyof CalculaterState;
    totalDivident += (nextFields[k] as Ingredient).divident;
  }
  const factor = newTotal / totalDivident;
  for (let key of IndrigentKeys) {
    const k = key as keyof CalculaterState;
    const ing = nextFields[k] as Ingredient;
    const newValue = Math.round(ing.divident * factor);
    nextFields[k] = { ...ing, value: newValue } as Ingredient;
  }
  nextFields.hydration = { ...nextFields.hydration, value: Math.round(calculateHydration(nextFields, starterHydration)) } as any;
  return nextFields;
}

export function setStarterHydrationCase(fields: CalculaterState, newStarter: number) {
  const newHydration = Math.round(calculateHydration(fields, newStarter));
  const nextFields = { ...fields, hydration: { ...fields.hydration, value: newHydration } } as CalculaterState;
  return nextFields;
}

export function setFieldValueCase(fields: CalculaterState, field: keyof CalculaterState, value: number, counter: number, starterHydration: number) {
  let nextFields = { ...fields, [field]: { ...fields[field], value } } as CalculaterState;

  if (counter === 0 && IndrigentKeys.includes(field as keyof CalculaterState)) {
    const changed = nextFields[field] as Ingredient;
    const factor = value / changed.divident;
    for (let key of IndrigentKeys) {
      const k = key as keyof CalculaterState;
      if (k !== field) {
        const ing = nextFields[k] as Ingredient;
        nextFields[k] = { ...ing, value: Math.round(ing.divident * factor) } as Ingredient;
      }
    }
  } else {
    for (let key of IndrigentKeys) {
      const k = key as keyof CalculaterState;
      if (k !== field && !(nextFields[k] as Ingredient).constant) {
        const ing = nextFields[k] as Ingredient;
        const factor = ing.value / ing.divident;
        const projected = { ...nextFields } as CalculaterState;
        const newVal = Math.round((ing.calculate as any)(projected, starterHydration));
        nextFields[k] = { ...ing, value: newVal, divident: newVal / factor } as Ingredient;
        break;
      }
    }
  }
  nextFields.hydration = { ...nextFields.hydration, value: Math.round(calculateHydration(nextFields, starterHydration)) } as any;
  nextFields.totalDough = { ...nextFields.totalDough, value: Math.round(calculateTotalDough(nextFields)) } as any;
  return nextFields;
}
