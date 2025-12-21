'use client'
import { NumberFieldState } from '../lib/types';

export type NumberFieldProps = {
  label: string;
  state: NumberFieldState;
  name: string;
  onChange: (name: string, value: string) => void;
  onChecked: () => void;
}

export default function NumberField({ label, state, name, onChange, onChecked }: NumberFieldProps) {
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
              <input type="checkbox" className="form-check-input" checked={state.constant} onChange={onChecked} disabled={state.disableConst} />
            </span>
          </div>
          <input type="number" id={"numberInput-".concat(name)} className="form-control" value={state.value} onChange={(e) => onChange(name, e.target.value)}
           min={state.min} max={state.max} disabled={state.disableNumber}/>
          <span className="input-group-text" id="basic-addon1">{state.unit}</span>
        </div>
      </div>
    </div>
  );
}
