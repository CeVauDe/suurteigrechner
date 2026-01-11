'use client'
import React from 'react'
import { NumberFieldState } from '../lib/types';

export type NumberFieldProps = {
  label: string;
  name: string;
  state?: NumberFieldState; // if provided, component is state-driven 
  value?: number; // for simple read-only or computed values (e.g., salt)
  onChange?: (name: string, value: number) => void;
  onChecked?: () => void;
  showCheckbox?: boolean; // default: true when `state` provided
  disabled?: boolean; // explicit override for disabled state
  debounceMs?: number; // milliseconds to wait after typing stops before calling onChange (default: 1000)
}

export default function NumberField({ label, state, name, value, onChange, onChecked, showCheckbox, disabled, debounceMs = 1000 }: NumberFieldProps) {
  const id = `numberInput-${name}`;
  const currentValue = state ? state.value : (value ?? 0);
  const currentUnit = state ? state.unit : 'g';
  const numberDisabled =  disabled || (state ? state.disableNumber : false);
  const checkboxVisible = showCheckbox === undefined ? !!state : showCheckbox;
  const checkboxDisabled = state ? state.disableConst : true;
  const checkboxChecked = state ? state.constant : false;

  // local string state for debounce
  const [internalValue, setInternalValue] = React.useState<string>(String(currentValue));
  const timerRef = React.useRef<number | null>(null);
  const lastSentRef = React.useRef<string>(String(currentValue));

  // sync when external value changes
  React.useEffect(() => {
    const s = String(currentValue);
    setInternalValue(s);
    lastSentRef.current = s;
  }, [currentValue]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    }
  }, []);

  const flush = React.useCallback((maybeName?: string, valueToSend?: string) => {
    if (!onChange) return;
    const v = valueToSend ?? internalValue;
    if (lastSentRef.current === v) return;
    const n = Number(v);
    if (isNaN(n)) return;
    const clampedNumber = state ? clamp(n, state.min, state.max) : n;
    onChange(maybeName ?? name, clampedNumber);
    lastSentRef.current = clampedNumber.toString();
  }, [internalValue, name, onChange]);

  const clamp = (val: number, min: number, max?: number) => {
    if (val < min) return min;
    if (max !== undefined && val > max) return max;
    return val;
  }

  const schedule = (val: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    // capture 'val' so we always send the last typed value, even if state hasn't updated yet
    timerRef.current = window.setTimeout(() => {
      flush(name, val);
      timerRef.current = null;
    }, debounceMs) as unknown as number;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInternalValue(v);
    schedule(v);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleBlur = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // flush current internal value
    flush(name, internalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      flush(name, internalValue);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="row mb-3 align-items-center">
      <div className="col-4 text-start">
        <label htmlFor={id} className="col-form-label">
          {label}
        </label>
      </div>

      <div className="col">
        <div className="input-group">
          {checkboxVisible && (
            <div className='input-group-text'>
              <span title="Konstant halten">
                <input type="checkbox" className="form-check-input" checked={checkboxChecked} onChange={() => onChecked && onChecked()} disabled={checkboxDisabled} />
                <span className="icon"></span>
              </span>
            </div>
          )}
          <input
            type="number"
            id={id}
            className="form-control text-end"
            value={internalValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            min={state ? state.min : undefined}
            max={state ? state.max : undefined}
            disabled={numberDisabled}
          />
          <span className="input-group-text">{currentUnit}</span>
        </div>
      </div>
    </div>
  );
}
