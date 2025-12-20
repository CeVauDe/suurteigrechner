// Calculator.js

'use client'
import React, { useState } from 'react';

type NumberFieldProps = {
  label: string,
  state: NumberFieldState,
  name: string,
  onChange: (name: any, value: string) => void,
  onChecked: (value: any) => void
}

export function NumberField({ label, state, name, onChange, onChecked }: NumberFieldProps) {
  return (
    <div className="row mb-3 align-items-center">
      <div className="col-auto">
        <label htmlFor={"numberInput-".concat(name)} className="col-form-label">
          {label}
        </label>
      </div>
      <div className="col-auto">
        <div className="input-group">
          <div className='input-group-text'>
            <span title="Konstant halten">
              <input type="checkbox" className="form-check-input" checked={state.constant} onChange={onChecked} disabled={state.diseableConst} />
            </span>
          </div>
          <input type="number" id={"numberInput-".concat(name)} className="form-control" value={state.value} onChange={(e) => onChange(name, e.target.value)} min={state.min} max={state.max}/>
          <span className="input-group-text" id="basic-addon1">{state.unit}</span>
        </div>
      </div>
    </div>
  );
}

class NumberFieldState {
  value: number;
  constant: boolean;
  diseableConst: boolean;
  unit: string;
  min: number;
  max: number;
  constructor(value: number, min: number, max: number, unit: string = "g", constant: boolean = false, diseableConst: boolean = false) {
    this.value = value;
    this.constant = constant;
    this.min = min;
    this.max = max;
    this.diseableConst = diseableConst;
    this.unit = unit;
  }
  toggle(): void {
    this.constant = !this.constant
  }
};

class Ingridient extends NumberFieldState {
  divident: number;
  calculate: (state: CalculaterState, starterHydration: number) => number;
  constructor(value: number, min: number, max: number, divident: number, calculate: (state: CalculaterState, starterHydration: number) => number, unit: string = "g", constant: boolean = false, diseableConst: boolean = false) {
    super(value, min, max, unit, constant, diseableConst);
    this.divident = divident;
    this.calculate = calculate;
  }
};

const IndrigentKeys = ["flour", "water", "starter"];
const CalcluaterKeys = IndrigentKeys.concat(["hydration"]);

type CalculaterState = {
  flour: Ingridient;
  water: Ingridient;
  starter: Ingridient;
  hydration: NumberFieldState;
};

const Calculator = () => {
  const calculateHydration = (state: CalculaterState, starterHydration: number) => {
    const sH = starterHydration / 100;
    return (state.water.value + (state.starter.value * (sH / (1 + sH)))) / (state.flour.value + (state.starter.value * (1 / (1 + sH)))) * 100
  }

  const calculateFlour = (state: CalculaterState, starterHydration: number) => {
    const sH = starterHydration / 100;
    const starterFlour = state.starter.value * (1 / (1 + sH));
    const starterWater = state.starter.value * (sH / (1 + sH));
    const H = state.hydration.value / 100;
    return (state.water.value + starterWater - (starterFlour * H)) / H;
  }

  const calculateWater = (state: CalculaterState, starterHydration: number) => {
    const sH = starterHydration / 100;
    const starterFlour = state.starter.value * (1 / (1 + sH));
    const starterWater = state.starter.value * (sH / (1 + sH));
    const H = state.hydration.value / 100;
    return H * state.flour.value + H * starterFlour - starterWater;
  }

  const calculateStarter = (state: CalculaterState, starterHydration: number) => {
    const sH = starterHydration / 100;
    const cFlour = (1 / (1 + sH));
    const cWater = (sH / (1 + sH));
    const H = state.hydration.value / 100;
    return ((H * state.flour.value) - state.water.value) / (cWater - (H * cFlour));
  }



  const [state, setState] = React.useState<CalculaterState>({
    flour: new Ingridient(1000, 0, 50000, 100, calculateFlour),
    water: new Ingridient(670, 0, 50000, 67, calculateWater),
    starter: new Ingridient(250, 0, 50000, 25, calculateStarter),
    hydration: new NumberFieldState(71, 0, 100, "%")
  });


  let [counter, setCounter] = useState<number>(0);
  let [starterHydration, setStarterHydration] = useState<number>(100);



  const toggle = (field: keyof CalculaterState) => {
    if (state[field].constant) {
      counter--;
      if (counter < 3) {
        for (let key of CalcluaterKeys) {
          const k = key as keyof CalculaterState;
          state[k].diseableConst = false;
          update(k, state[k]);
        }
      }
    } else {
      counter++;
      if (counter >= 3) {
        for (let key of CalcluaterKeys) {
          const k = key as keyof CalculaterState;
          if (!state[k].constant && k != field) {
            state[k].diseableConst = true;
            update(k, state[k]);
          }
        }
      }
    }
    setCounter(counter);
    state[field].toggle();
    update(field, state[field]);
  };

  const handleHydrationChange = (field: string, value: string) => {
    state.hydration.value = Number(value);
    update("hydration", state.hydration);
    for (let key of IndrigentKeys) {
      const k = key as keyof CalculaterState;
      const ingridient = state[k] as Ingridient;
      if (!ingridient.constant) {
        state[k].value = Math.round(ingridient.calculate(state, starterHydration));
        update(k, state[k]);
        break;
      }
    }
  }

  const handleStarterHydrationChange = (value: string) => {
    starterHydration = Number(value);
    setStarterHydration(starterHydration);
    state.hydration.value = Math.round(calculateHydration(state, starterHydration));
    update("hydration", state.hydration);
  }


  const update = (field: keyof CalculaterState, update: NumberFieldState) => {
    setState(prev => ({
      ...prev,
      [field]: update instanceof Ingridient ? new Ingridient(
        update.value,
        update.min,
        update.max,
        update.divident,
        update.calculate,
        update.unit,
        update.constant,
        update.diseableConst
      ) : new NumberFieldState(update.value,
        update.min,
        update.max,
        update.unit,
        update.constant,
        update.diseableConst)
    }));
  };



  const handleChange = (field: keyof CalculaterState, value: string) => {
    state[field].value = Number(value);
    update(field, state[field]);
    if (counter == 0 && IndrigentKeys.includes(field)) {
      const changedIngridient = state[field] as Ingridient;
      const factor = Number(value) / changedIngridient.divident;
      for (let key of IndrigentKeys) {
        const k = key as keyof CalculaterState;
        if (k != field) {
          const ingridient = state[k] as Ingridient;
          state[k].value = Math.round(ingridient.divident * factor);
          update(k, state[k])
        }
      }
    } else {
      for (let key of IndrigentKeys) {
        const k = key as keyof CalculaterState;
        if (k != field && !state[k].constant) {
          const ingridient = state[k] as Ingridient;
          state[k].value = Math.round(ingridient.calculate(state, starterHydration));
          update(k, state[k]);
          break;
        }
      }
    }
    state.hydration.value = Math.round(calculateHydration(state, starterHydration));
    update("hydration", state.hydration);
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
                onChange={(e) => handleStarterHydrationChange(e.target.value)} />
              <span className="input-group-text" id="basic-addon1">%</span>
            </div>
          </div>
          <div className="col-auto">

          </div>
        </div>

        <NumberField label='Mehl' name='flour' state={state.flour} onChange={handleChange} onChecked={() => toggle("flour")} />
        <NumberField label='Wasser' name='water' state={state.water} onChange={handleChange} onChecked={() => toggle("water")} />
        <NumberField label='Starter' name='starter' state={state.starter} onChange={handleChange} onChecked={() => toggle("starter")} />
        <NumberField label='Hydration' name='hydration' state={state.hydration} onChange={handleHydrationChange} onChecked={() => toggle("hydration")} />
      </form>

    </>
  );
};

export default Calculator;