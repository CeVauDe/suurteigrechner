// Calculator.js

'use client'
import React from 'react';
import NumberField from '../components/NumberField';
import type { CalculaterState } from '../lib/types';
import { toggleConstCase, setHydrationCase, setTotalDoughCase, setStarterHydrationCase, setFieldValueCase } from '../lib/reducerHelpers';
import { createInitialCalculatorState } from '../lib/calculatorState';
import { deleteSavedCalculation, listSavedCalculations, listSavedCalculationsWithStatus, loadSavedCalculation, saveCalculation } from '../lib/calculatorSaves';

const Calculator = () => {
  const initialCalculatorState = createInitialCalculatorState();

  type Action =
    | { type: 'RESET' }
    | { type: 'RESTORE_STATE', state: CalculaterState }
    | { type: 'TOGGLE_CONST', field: keyof CalculaterState }
    | { type: 'SET_HYDRATION', value: number }
    | { type: 'SET_TOTAL_DOUGH', value: number }
    | { type: 'SET_STARTER_HYDRATION', value: number }
    | { type: 'SET_FIELD_VALUE', field: keyof CalculaterState, value: number }

  const reducer = (state: CalculaterState, action: Action): CalculaterState => {
    switch (action.type) {
      case 'RESET':
        return initialCalculatorState;
      case 'RESTORE_STATE':
        return action.state;
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
  const [saveStatus, setSaveStatus] = React.useState('');
  const [savedCalculations, setSavedCalculations] = React.useState<ReturnType<typeof listSavedCalculations>>([]);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    const result = listSavedCalculationsWithStatus();
    setSavedCalculations(result.entries);
    if (result.recoveredFromCorruption) {
      setSaveStatus('Ungültigi Speicherdatei isch zrüggsetzt worde.');
    }
  }, []);

  const reset = () => dispatch({ type: 'RESET' });

  const getDefaultSaveName = (state: CalculaterState): string => {
    const totalDough = Math.round(state.totalDough.value);
    const hydration = Math.round(state.hydration.value);
    return `Total Teigmasse ${totalDough} g @ ${hydration}% Hydration`;
  }

  const formatSavedDateTime = (isoDateTime: string): string => {
    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) return isoDateTime;
    return date.toLocaleString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const handleSave = () => {
    const normalizedName = getDefaultSaveName(fields);

    const savedEntry = saveCalculation(normalizedName, fields);
    const refreshed = listSavedCalculations();
    setSavedCalculations(refreshed);
    setSaveStatus(`Gspeicheret: ${savedEntry.name}`);
  }

  const handleLoad = (id: string) => {
    const loaded = loadSavedCalculation(id);
    if (!loaded) {
      setSaveStatus('Speicherstand nöd gfunde.');
      return;
    }
    dispatch({ type: 'RESTORE_STATE', state: loaded });
    const selected = savedCalculations.find((entry) => entry.id === id);
    setSaveStatus(selected ? `Glade: ${selected.name}` : 'Rechnig glade.');
  }

  const handleDelete = (id: string) => {
    const deleted = deleteSavedCalculation(id);
    if (!deleted) {
      setSaveStatus('Lösche nöd möglich.');
      return;
    }
    const refreshed = listSavedCalculations();
    setSavedCalculations(refreshed);
    setSaveStatus('Speicherstand glöscht.');
  }




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

  if (!isMounted) {
    return null;
  }

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
        <div className="card mb-3">
          <div className="card-header btn-primary">
            Gspeichereti Rechnige
          </div>
          <div className="card-body">
            <div className="d-grid mb-3">
              <button type="button" className="btn btn-primary" onClick={handleSave}>Aktuelli Rechnig speichere</button>
            </div>
            <div className="d-flex flex-column gap-2">
              {savedCalculations.length === 0 && (
                <p className="mb-0 text-start text-muted">No kei Rechnige gspeicheret.</p>
              )}
              {savedCalculations.map((entry) => (
                <div key={entry.id} className="border border-primary rounded-3 bg-light p-2">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="flex-grow-1 text-center fw-semibold">{entry.name}</div>
                    <small className="text-muted text-nowrap">{formatSavedDateTime(entry.updatedAt)}</small>
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-2">
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleLoad(entry.id)}>Lade</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(entry.id)}>Lösche</button>
                  </div>
                </div>
              ))}
            </div>
            {saveStatus && <p className="mt-3 mb-0 text-start">{saveStatus}</p>}
          </div>
        </div>
        <button type="button" className='btn btn-primary' onClick={reset}>alles zrüggsetze</button>
      </form>

    </>
  );
};

export default Calculator;