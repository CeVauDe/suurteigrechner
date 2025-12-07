// Calculator.js

'use client'
import React, { useState } from 'react';

type NumberFieldProps = {
  label: string;
  name: string;
  value: number;
  checked: boolean;
  onChange: (name: any, value: string) => void;
  onChecked: (value: any) => void;
};

export function NumberField({ label, name, value, checked, onChange, onChecked }: NumberFieldProps) {
  return (
    <div className="row mb-3 align-items-center">
      <div className="col-auto">
        <label htmlFor="input2" className="col-form-label">
          {label}
        </label>
      </div>
      <div className="col-auto">
        <input type="number" className="form-control" value={value} onChange={(e) => onChange(name, e.target.value)} />
      </div>
      <div className="col-auto">
        <div className="form-check">
          <span title="Konstant halten" style={{ marginLeft: '4px', cursor: 'help' }}>
            <input type="checkbox" className="form-check-input" checked={checked} onChange={onChecked} />
          </span>
        </div>
      </div>
    </div>
  );
}

class Ingridient {
  value: number;
  divident: number;
  constant: boolean;
  calculate: (state: IngridientState, starterHydration: number, hydration: number) => number;
  constructor(value: number, divident: number, constant: boolean, calculate: (state: IngridientState, starterHydration: number, hydration: number) => number) {
    this.value = value;
    this.divident = divident;
    this.constant = constant;
    this.calculate = calculate;
  }
  toggle(): void {
    this.constant = !this.constant
  }
};

const IndrigentKeys = ["flour", "water", "starter"]

type IngridientState = {
  flour: Ingridient;
  water: Ingridient;
  starter: Ingridient;
};

const Calculator = () => {
  const calculateHydration = (state: IngridientState, starterHydration: number) => {
    const sH = starterHydration / 100;
    return (state.water.value + state.starter.value * (sH / 1 + sH)) / (state.flour.value + state.starter.value * (1 / 1 + sH)) * 100
  }

  const calculateFlour = (state: IngridientState, starterHydration: number, hydration: number) => {
    const sH = starterHydration / 100;
    const starterFlour = state.starter.value * (1 / 1 + sH);
    const starterWater = state.starter.value * (sH / 1 + sH);
    const H = hydration / 100;
    return (state.water.value + starterWater - starterFlour * H) / H;
  }

  const calculateWater = (state: IngridientState, starterHydration: number, hydration: number) => {
    const sH = starterHydration / 100;
    const starterFlour = state.starter.value * (1 / 1 + sH);
    const starterWater = state.starter.value * (sH / 1 + sH);
    const H = hydration / 100;
    return H * state.flour.value + H * starterFlour - starterWater;
  }

  const calculateStarter = (state: IngridientState, starterHydration: number, hydration: number) => {
    const sH = starterHydration / 100;
    const cFlour = (1 / 1 + sH);
    const cWater = (sH / 1 + sH);
    const H = hydration / 100;
    return (H * state.flour.value - state.water.value) / (cWater - H * cFlour);
  }



  const [state, setState] = React.useState<IngridientState>({
    flour: new Ingridient(1000, 100, false, calculateFlour),
    water: new Ingridient(670, 67, false, calculateWater),
    starter: new Ingridient(250, 25, false, calculateStarter)
  });

  let [counter, setCounter] = useState<number>(0);
  let [starterHydration, setStarterHydration] = useState<number>(100);
  let [hydration, setHydration] = useState<number>(71);
  let [hydrationConst, setHydrationConst] = useState<boolean>(false);



  const toggle = (field: keyof IngridientState) => {
    if (state[field].constant) {
      counter--;
    } else {
      counter++;
    }
    setCounter(counter);
    state[field].toggle();
    update(field, state[field]);
  };

  const toggleHydration = () => {
    if (hydrationConst) {
      counter--;
    } else {
      counter++;
    }
    setCounter(counter);
    setHydrationConst(!hydrationConst);
  }

  const handleHydrationChange = (field: string, value: string) => {
    setHydration(Number(value));
    for (let key of IndrigentKeys) {
      const k = key as keyof IngridientState;
      if (!state[k].constant) {
        state[k].value = state[k].calculate(state, starterHydration, hydration);
        update(k, state[k]);
        break;
      }
    }
  }

  const handleStarterHydrationChange = (value: string) => {
    setStarterHydration(Number(value));
    setHydration(calculateHydration(state, starterHydration));
  }


  const update = (field: keyof IngridientState, update: Ingridient) => {
    setState(prev => ({
      ...prev,
      [field]: new Ingridient(
        update.value,
        update.divident,
        update.constant,
        update.calculate
      )
    }));
  };



  const handleChange = (field: keyof IngridientState, value: string) => {
    state[field].value = Number(value);
    update(field, state[field]);
    if (counter == 0) {
      const factor = Number(value) / state[field].divident;
      for (let key of IndrigentKeys) {
        const k = key as keyof IngridientState;
        if (k != field) {
          state[k].value = state[k].divident * factor;
          update(k, state[k])
        }
      }
    } else {
      for (let key of IndrigentKeys) {
        const k = key as keyof IngridientState;
        if (k != field && !state[k].constant) {
          state[k].value = state[k].calculate(state, starterHydration, hydration);
          update(k, state[k]);
          break;
        }
      }
    }
    setHydration(calculateHydration(state, starterHydration));
  };

  return (
    <>
      <form>
        {/* Feld 1: Hydration Starter */}
        <div className="row mb-3 align-items-center">
          <div className="col-auto">
            <label htmlFor="input1" className="col-form-label">
              Hydration Starter {counter}:
            </label>
          </div>
          <div className="col-auto">
            <input type="number" className="form-control" value={starterHydration} min="0" max="100"
              onChange={(e) => handleStarterHydrationChange(e.target.value)} />
          </div>
          <div className="col-auto">

          </div>
        </div>

        <NumberField label='Mehl' name='flour' value={state.flour.value} checked={state.flour.constant} onChange={handleChange} onChecked={() => toggle("flour")} />
        <NumberField label='Wasser' name='water' value={state.water.value} checked={state.water.constant} onChange={handleChange} onChecked={() => toggle("water")} />
        <NumberField label='Starter' name='starter' value={state.starter.value} checked={state.starter.constant} onChange={handleChange} onChecked={() => toggle("starter")} />
        <NumberField label='Hydration' name='hydration' value={hydration} checked={hydrationConst} onChange={handleHydrationChange} onChecked={toggleHydration} />
      </form>

    </>
  );
};

export default Calculator;