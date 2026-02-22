// Calculator.js

'use client'
import React from 'react';
import NumberField from '../components/NumberField';
import type { CalculaterState } from '../lib/types';
import { toggleConstCase, setHydrationCase, setTotalDoughCase, setStarterHydrationCase, setFieldValueCase } from '../lib/reducerHelpers';
import { createInitialCalculatorState } from '../lib/calculatorState';
import { useRouter } from 'next/router';
import { hasDuplicateSaveName, getNormalizedSaveName } from '../lib/calculatorSaveHelpers';
import { deleteSavedCalculation, listSavedCalculations, loadSavedCalculation, overwriteSavedCalculation, renameSavedCalculation, saveCalculation } from '../lib/calculatorSaves';

const Calculator = () => {
  const router = useRouter();
  const isDedicatedCalculatorPage = router.pathname === '/calculator';

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
  const [saveName, setSaveName] = React.useState('');
  const [renameName, setRenameName] = React.useState('');
  const [selectedSaveId, setSelectedSaveId] = React.useState('');
  const [saveStatus, setSaveStatus] = React.useState('');
  const [savedCalculations, setSavedCalculations] = React.useState(() => listSavedCalculations());

  React.useEffect(() => {
    if (!isDedicatedCalculatorPage) return;
    setSavedCalculations(listSavedCalculations());
  }, [isDedicatedCalculatorPage]);

  const reset = () => dispatch({ type: 'RESET' });

  const handleSave = () => {
    const normalizedName = getNormalizedSaveName(saveName);
    if (!normalizedName) {
      setSaveStatus('Bitte gib en Name ii.');
      return;
    }

    const existingNames = savedCalculations.map((entry) => entry.name);
    if (hasDuplicateSaveName(normalizedName, existingNames)) {
      setSaveStatus('Name git scho. Bitte überschriibe oder andere Name.');
      return;
    }

    const savedEntry = saveCalculation(normalizedName, fields);
    const refreshed = listSavedCalculations();
    setSavedCalculations(refreshed);
    setSaveName('');
    setSelectedSaveId(savedEntry.id);
    setRenameName(savedEntry.name);
    setSaveStatus(`Gspeicheret: ${savedEntry.name}`);
  }

  const handleLoad = () => {
    if (!selectedSaveId) {
      setSaveStatus('Bitte zuerst en Speicherstand ussueche.');
      return;
    }
    const loaded = loadSavedCalculation(selectedSaveId);
    if (!loaded) {
      setSaveStatus('Speicherstand nöd gfunde.');
      return;
    }
    dispatch({ type: 'RESTORE_STATE', state: loaded });
    const selected = savedCalculations.find((entry) => entry.id === selectedSaveId);
    setSaveStatus(selected ? `Glade: ${selected.name}` : 'Rechnig glade.');
  }

  const handleOverwrite = () => {
    if (!selectedSaveId) {
      setSaveStatus('Bitte en Speicherstand zum Überschriibe ussueche.');
      return;
    }
    const overwritten = overwriteSavedCalculation(selectedSaveId, fields);
    if (!overwritten) {
      setSaveStatus('Überschriibe nöd möglich.');
      return;
    }
    const refreshed = listSavedCalculations();
    setSavedCalculations(refreshed);
    setSaveStatus(`Überschriebe: ${overwritten.name}`);
  }

  const handleRename = () => {
    if (!selectedSaveId) {
      setSaveStatus('Bitte en Speicherstand zum Umbenenne ussueche.');
      return;
    }

    const normalizedName = getNormalizedSaveName(renameName);
    if (!normalizedName) {
      setSaveStatus('Bitte en gültige neue Name ii.');
      return;
    }

    const renamed = renameSavedCalculation(selectedSaveId, normalizedName);
    if (!renamed) {
      setSaveStatus('Umbenenne nöd möglich (Name existiert evtl. scho).');
      return;
    }

    const refreshed = listSavedCalculations();
    setSavedCalculations(refreshed);
    setSaveStatus(`Umbenennt uf: ${normalizedName}`);
  }

  const handleDelete = () => {
    if (!selectedSaveId) {
      setSaveStatus('Bitte en Speicherstand zum Lösche ussueche.');
      return;
    }
    const deleted = deleteSavedCalculation(selectedSaveId);
    if (!deleted) {
      setSaveStatus('Lösche nöd möglich.');
      return;
    }
    const refreshed = listSavedCalculations();
    setSavedCalculations(refreshed);
    setSelectedSaveId('');
    setRenameName('');
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
        {isDedicatedCalculatorPage && (
          <div className="card mb-3">
            <div className="card-header btn-primary">
              Gspeichereti Rechnige
            </div>
            <div className="card-body">
              <div className="row g-2 mb-3">
                <div className="col">
                  <input
                    type="text"
                    className="form-control"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Name für d'Rechnig"
                  />
                </div>
                <div className="col-auto">
                  <button type="button" className="btn btn-primary" onClick={handleSave}>Spichere</button>
                </div>
              </div>
              <div className="row g-2">
                <div className="col">
                  <select
                    className="form-select"
                    value={selectedSaveId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedSaveId(nextId);
                      const selected = savedCalculations.find((entry) => entry.id === nextId);
                      setRenameName(selected?.name ?? '');
                    }}
                  >
                    <option value="">Bitte wäle</option>
                    {savedCalculations.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-auto">
                  <button type="button" className="btn btn-outline-primary" onClick={handleLoad}>Lade</button>
                </div>
              </div>
              <div className="row g-2 mt-2">
                <div className="col-auto">
                  <button type="button" className="btn btn-outline-primary" onClick={handleOverwrite}>Überschriibe</button>
                </div>
                <div className="col-auto">
                  <button type="button" className="btn btn-outline-danger" onClick={handleDelete}>Lösche</button>
                </div>
              </div>
              <div className="row g-2 mt-2">
                <div className="col">
                  <input
                    type="text"
                    className="form-control"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder="Neue Name"
                  />
                </div>
                <div className="col-auto">
                  <button type="button" className="btn btn-outline-primary" onClick={handleRename}>Umbenenne</button>
                </div>
              </div>
              {saveStatus && <p className="mt-3 mb-0 text-start">{saveStatus}</p>}
            </div>
          </div>
        )}
        <button type="button" className='btn btn-primary' onClick={reset}>alles zrüggsetze</button>
      </form>

    </>
  );
};

export default Calculator;