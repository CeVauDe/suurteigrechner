'use client'
import { NumberFieldState } from '../lib/types';

export type NumberFieldProps = {
  label: string;
  name: string;
  state?: NumberFieldState; // if provided, component is state-driven 
  value?: number; // for simple read-only or computed values (e.g., salt)
  onChange?: (name: string | undefined, value: string) => void;
  onChecked?: () => void;
  showCheckbox?: boolean; // default: true when `state` provided
  disabled?: boolean; // explicit override for disabled state
}

export default function NumberField({ label, state, name, value, onChange, onChecked, showCheckbox, disabled }: NumberFieldProps) {
  const id = `numberInput-${name}`;
  const currentValue = state ? state.value : (value ?? 0);
  const currentUnit = state ? state.unit : 'g';
  const numberDisabled =  disabled || (state ? state.disableNumber : false);
  const checkboxVisible = showCheckbox === undefined ? !!state : showCheckbox;
  const checkboxDisabled = state ? state.disableConst : true;
  const checkboxChecked = state ? state.constant : false;

  return (
    <div className="row mb-3 align-items-center">
      <div className="col-12 col-md-4 text-md-start">
        <label htmlFor={id} className="col-form-label">
          {label}
        </label>
      </div>

      <div className="col-12 col-md-8">
        <div className="input-group">
          {checkboxVisible && (
            <div className='input-group-text'>
              <span title="Konstant halten">
                <input type="checkbox" className="form-check-input" checked={checkboxChecked} onChange={() => onChecked && onChecked()} disabled={checkboxDisabled} />
              </span>
            </div>
          )}
          <input type="number" id={id} className="form-control text-end" value={currentValue} onChange={(e) => onChange && onChange(name, e.target.value)} min={state ? state.min : undefined} max={state ? state.max : undefined} disabled={numberDisabled} />
          <span className="input-group-text">{currentUnit}</span>
        </div>
      </div>
    </div>
  );
}
