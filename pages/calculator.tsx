// Calculator.js

'use client'
import React from 'react';
import NumberField from '../components/NumberField';
import type { CalculaterState } from '../lib/types';
import { toggleConstCase, setHydrationCase, setTotalDoughCase, setStarterHydrationCase, setFieldValueCase } from '../lib/reducerHelpers';
import { createInitialCalculatorState } from '../lib/calculatorState';

const Calculator = () => {

  const initialCalculatorState = createInitialCalculatorState();

  type Action =
    | { type: 'RESET' }
    | { type: 'TOGGLE_CONST', field: keyof CalculaterState }
    | { type: 'SET_HYDRATION', value: number }
    | { type: 'SET_TOTAL_DOUGH', value: number }
    | { type: 'SET_STARTER_HYDRATION', value: number }
    | { type: 'SET_FIELD_VALUE', field: keyof CalculaterState, value: number }

  const reducer = (state: CalculaterState, action: Action): CalculaterState => {
    switch (action.type) {
      case 'RESET':
        return initialCalculatorState;
      case 'TOGGLE_CONST': {
        const nextFields = toggleConstCase(state, action.field);
        return nextFields;
      }
      case 'SET_HYDRATION': {
        return setHydrationCase(state, action.value);
      }
      case 'SET_TOTAL_DOUGH': {
        return setTotalDoughCase(state, action.value);
      }
      case 'SET_STARTER_HYDRATION': {
        return setStarterHydrationCase(state, action.value);
      }
      case 'SET_FIELD_VALUE': {
        return setFieldValueCase(state, action.field, action.value);
      }
      default:
        return state;
    }
  }

  const [fields, dispatch] = React.useReducer(reducer, initialCalculatorState);

  const reset = () => dispatch({ type: 'RESET' });




  const toggle = (field: keyof CalculaterState) => {
    dispatch({ type: 'TOGGLE_CONST', field });
  };

  const handleHydrationChange = (field: string, value: number) => {
    dispatch({ type: 'SET_HYDRATION', value: value });
  }

  const handleTotalDoughChange = (value: number) => {
    dispatch({ type: 'SET_TOTAL_DOUGH', value: value });
  }

  const handleStarterHydrationChange = (value: number) => {
    dispatch({ type: 'SET_STARTER_HYDRATION', value: value });
  }

  const handleChange = (field: string, value: number) => {
    const fieldKey = (field as keyof CalculaterState);
    dispatch({ type: 'SET_FIELD_VALUE', field: fieldKey, value: value });
  };

  return (
    <>
      <form className='text-center'>
        <div className="card mb-3">
          <div className="card-header btn-primary">
            Was du hesch
          </div>
          <div className="card-body">
            <NumberField label='Hydrationstarter' name='starterHydration' state={fields.starterHydration} onChange={(_, v) => handleStarterHydrationChange(v)} showCheckbox={false} />
          </div>
        </div>
        <div className="card mb-3">
          <div className="card-header btn-primary">
            Was du wotsch
          </div>
          <div className="card-body">
            <NumberField label='Hydration' name='hydration' state={fields.hydration} onChange={handleHydrationChange} onChecked={() => toggle("hydration")} />
            <NumberField label='Total Teigmasse' name='totalDough' state={fields.totalDough} onChange={(n, v) => handleTotalDoughChange(v)} showCheckbox={false} />
          </div></div>
        <div className="card mb-3">
          <div className="card-header btn-primary">
            Was du bruchsch
          </div>
          <div className="card-body">
            <NumberField label='Mehl' name='flour' state={fields.flour} onChange={handleChange} onChecked={() => toggle("flour")} />
            <NumberField label='Wasser' name='water' state={fields.water} onChange={handleChange} onChecked={() => toggle("water")} />
            <NumberField label='Starter' name='starter' state={fields.starter} onChange={handleChange} onChecked={() => toggle("starter")} />
            <NumberField label='Salz' name='salt' value={Math.round(fields.flour.value * 0.02)} showCheckbox={false} disabled />
          </div>
        </div>
        <button className='btn btn-primary' onClick={reset}>alles zrüggsetze</button>
      </form>

    </>
  );
};

export default Calculator;