// Calculator.js

'use client'
import React from 'react';
import { calculateFlour, calculateWater, calculateStarter } from '../lib/calc';
import NumberField from '../components/NumberField';
import type { NumberFieldState, Ingredient, CalculaterState } from '../lib/types';
import { toggleConstCase, setHydrationCase, setTotalDoughCase, setStarterHydrationCase, setFieldValueCase } from '../lib/reducerHelpers';

const Calculator = () => {
  // calculation functions moved to `lib/calc.ts`

  const initialCalculatorState : CalculaterState = {
    flour: { value: 1000, min: 0, max: 50000, divident: 100, calculate: calculateFlour, unit: 'g', constant: false, disableConst: false, disableNumber: false },
    water: { value: 670, min: 0, max: 50000, divident: 67, calculate: calculateWater, unit: 'g', constant: false, disableConst: false, disableNumber: false },
    starter: { value: 250, min: 0, max: 50000, divident: 25, calculate: calculateStarter, unit: 'g', constant: false, disableConst: false, disableNumber: false },
    hydration: { value: 71, min: 0, max: 100, unit: '%', constant: false, disableConst: false, disableNumber: false },
    totalDough: { value: 1920, min: 0, max: 100000, unit: 'g', constant: false, disableConst: false, disableNumber: false }
  }

  type ReducerState = {
    fields: CalculaterState;
    counter: number;
    starterHydration: number;
    disableStarterHyd: boolean;
  }

  type Action =
    | { type: 'RESET' }
    | { type: 'SET_FIELD', field: keyof CalculaterState, value: NumberFieldState | Ingredient }
    | { type: 'TOGGLE_CONST', field: keyof CalculaterState }
    | { type: 'SET_HYDRATION', value: number }
    | { type: 'SET_TOTAL_DOUGH', value: number }
    | { type: 'SET_STARTER_HYDRATION', value: number }
    | { type: 'SET_FIELD_VALUE', field: keyof CalculaterState, value: number }

  const initialReducerState: ReducerState = {
    fields: initialCalculatorState,
    counter: 0,
    starterHydration: 100,
    disableStarterHyd: false
  }

  

  const reducer = (state: ReducerState, action: Action): ReducerState => {
    const fields = state.fields;
    switch (action.type) {
      case 'RESET':
        return initialReducerState;
      case 'SET_FIELD': {
        return { ...state, fields: { ...fields, [action.field]: { ...(action.value as any) } } };
      }
      case 'TOGGLE_CONST': {
        const { nextFields, nextCounter, disableStarterHyd } = toggleConstCase(fields, action.field, state.counter);
        const nextState = { ...state, fields: nextFields, counter: nextCounter } as ReducerState;
        if (disableStarterHyd !== undefined) nextState.disableStarterHyd = disableStarterHyd;
        return nextState;
      }
      case 'SET_HYDRATION': {
        const nextFields = setHydrationCase(fields, action.value, state.starterHydration);
        return { ...state, fields: nextFields };
      }
      case 'SET_TOTAL_DOUGH': {
        const nextFields = setTotalDoughCase(fields, action.value, state.starterHydration);
        return { ...state, fields: nextFields };
      }
      case 'SET_STARTER_HYDRATION': {
        const nextFields = setStarterHydrationCase(fields, action.value);
        return { ...state, starterHydration: action.value, fields: nextFields };
      }
      case 'SET_FIELD_VALUE': {
        const nextFields = setFieldValueCase(fields, action.field, action.value, state.counter, state.starterHydration);
        return { ...state, fields: nextFields };
      }
      default:
        return state;
    }
  }

  const [reducerState, dispatch] = React.useReducer(reducer, initialReducerState);
  const { fields, counter, starterHydration, disableStarterHyd } = reducerState;

  const reset = () => dispatch({ type: 'RESET' });




  const toggle = (field: keyof CalculaterState) => {
    dispatch({ type: 'TOGGLE_CONST', field });
  };

  const handleHydrationChange = (field: string, value: string) => {
    const newValue = Number(value);
    dispatch({ type: 'SET_HYDRATION', value: newValue });
  }

  const handleTotalDoughChange = (value: string) => {
    const newTotal = Number(value);
    dispatch({ type: 'SET_TOTAL_DOUGH', value: newTotal });
  }

  const handleStarterHydrationChange = (value: string) => {
    const newStarterHydration = Number(value);
    dispatch({ type: 'SET_STARTER_HYDRATION', value: newStarterHydration });
  }

  const handleChange = (field: string, value: string) => {
    const fieldKey = field as keyof CalculaterState;
    const newValue = Number(value);
    dispatch({ type: 'SET_FIELD_VALUE', field: fieldKey, value: newValue });
  };

  return (
    <>
      <form>
        {/* Feld 1: Hydration Starter */}
        <div className="row mb-3 align-items-center">
          <div className="col-auto">
            <label htmlFor="starterHydration" className="col-form-label">
              Hydration Starter:
            </label>
          </div>
          <div className="col-auto">
            <div className="input-group">
              <input type="number" id="starterHydration" className="form-control" value={starterHydration} min="0" max="100"
                onChange={(e) => handleStarterHydrationChange(e.target.value)} disabled={disableStarterHyd} />
              <span className="input-group-text" id="basic-addon1">%</span>
            </div>
          </div>
        </div>

        <NumberField label='Mehl' name='flour' state={fields.flour} onChange={handleChange} onChecked={() => toggle("flour")} />
        <NumberField label='Wasser' name='water' state={fields.water} onChange={handleChange} onChecked={() => toggle("water")} />
        <NumberField label='Starter' name='starter' state={fields.starter} onChange={handleChange} onChecked={() => toggle("starter")} />
          {/* Feld: salt */}
        <div className="row mb-3 align-items-center">
          <div className="col-auto">
            <label htmlFor="salt" className="col-form-label">
              Salz
            </label>
          </div>
          <div className="col-auto">
            <div className="input-group">
              <input type="number" id="salt" className="form-control" value={Math.round(fields.flour.value * 0.02)}  disabled />
              <span className="input-group-text" id="basic-addon1">g</span>
            </div>
          </div>
        </div>
        <NumberField label='Hydration' name='hydration' state={fields.hydration} onChange={handleHydrationChange} onChecked={() => toggle("hydration")} />
        {/* Feld: totalDough */}
        <div className="row mb-3 align-items-center">
          <div className="col-auto">
            <label htmlFor="totalDough" className="col-form-label">
              Total Teig Masse
            </label>
          </div>
          <div className="col-auto">
            <div className="input-group">
              <input type="number" id="totalDough" className="form-control" value={fields.totalDough.value} min={fields.totalDough.min} max={fields.totalDough.max}
                onChange={(e) => handleTotalDoughChange(e.target.value)} disabled={fields.totalDough.disableNumber} />
              <span className="input-group-text" id="basic-addon1">g</span>
            </div>
          </div>
        </div>
        <button className='btn btn-primary' onClick={reset}>Reset</button>
      </form>

    </>
  );
};

export default Calculator;