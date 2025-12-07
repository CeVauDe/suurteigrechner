// Calculator.js

'use client'
import React, { useState } from 'react';

type NumberFieldProps = {
  label: string;
  name: string;
  value: number;
  checked: boolean;
  onChange: (name: string, value: string) => void;
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

type Ingridient = {
  value: number,
  divident: number;
  const: boolean;
};

type CalculatorState = {
  starterHydration: number;
  flour: number;
  water: number;
  starter: number;
  hydration: number;


  flourConst: boolean;
  waterConst: boolean;
  starterConst: boolean;
  hydrationConst: boolean;
};

const Calculator = () => {


  const [state, setState] = React.useState<CalculatorState>({
    starterHydration: 100,
    flour: 1000,
    water: 670,
    starter: 250,
    hydration: 71,


    flourConst: false,
    waterConst: false,
    starterConst: false,
    hydrationConst: false
  });


  const toggle = <K extends keyof CalculatorState>(key: K) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  };



  const handleChange = (field: string, value: string) => {

  };

  return (
    <>
      <form>
        {/* Feld 1: Hydration Starter */}
        <div className="row mb-3 align-items-center">
          <div className="col-auto">
            <label htmlFor="input1" className="col-form-label">
              Hydration Starter:
            </label>
          </div>
          <div className="col-auto">
            <input type="number" className="form-control" value={state.starterHydration} min="0" max="100"
              onChange={(e) => handleChange("starterHydration", e.target.value)} />
          </div>
          <div className="col-auto">

          </div>
        </div>

        <NumberField label='Mehl' name='flour' value={state.flour} checked={state.flourConst} onChange={handleChange} onChecked={() => toggle("flourConst")} />
        <NumberField label='Wasser' name='water' value={state.water} checked={state.waterConst} onChange={handleChange} onChecked={() => toggle("waterConst")} />
        <NumberField label='Starter' name='starter' value={state.starter} checked={state.starterConst} onChange={handleChange} onChecked={() => toggle("starterConst")} />
        <NumberField label='Hydration' name='hydration' value={state.hydration} checked={state.hydrationConst} onChange={handleChange} onChecked={() => toggle("hydrationConst")} />
      </form>

    </>
  );
};

export default Calculator;