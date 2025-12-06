// Calculator.js

'use client'
import React, { useState } from 'react';

type NumberFieldProps = {
label: string;
name: string;
value: number;
checked: boolean;
onChange: (name: string, value: string) => void;
};

export function NumberField({label, name, value, checked, onChange}: NumberFieldProps){
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
              <input type="checkbox" className="form-check-input" checked={checked}/>
              </span>
            </div>
          </div>
        </div>
  );
}

const Calculator = () => {
  const [starterHydration, setStarterHydration] = useState(100);
  const [flour, setFlour] = useState(1000);
  const [water, setWater] = useState(670);
  const [starter, setStarter] = useState(250);
  const [hydration, setHydration] = useState(71);


  const [flourConst, setFlourConst] = useState(false);
  const [waterConst, setWaterConst] = useState(false);
  const [starterConst, setStarterConst] = useState(false);
  const [hydrationConst, setHydrationConst] = useState(false);





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
            <input type="number" className="form-control" value={starterHydration} min="0" max="100"
              onChange={(e) => handleChange("starterHydration", e.target.value)} />
          </div>
          <div className="col-auto">

          </div>
        </div>

        <NumberField label='Mehl' name='flour' value={flour}  checked={flourConst} onChange={handleChange}/>
        <NumberField label='Wasser' name='water' value={water}  checked={waterConst} onChange={handleChange}/>
        <NumberField label='Starter' name='starter' value={starter}  checked={starterConst} onChange={handleChange}/>
        <NumberField label='Hydration' name='hydration' value={hydration}  checked={hydrationConst} onChange={handleChange}/>
      </form>

    </>
  );
};

export default Calculator;