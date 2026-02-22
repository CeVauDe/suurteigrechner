// Calculator.js

'use client'
import React from 'react';
import NumberField from '../components/NumberField';
import type { CalculaterState } from '../lib/types';
import { toggleConstCase, setHydrationCase, setTotalDoughCase, setStarterHydrationCase, setFieldValueCase } from '../lib/reducerHelpers';
import { createInitialCalculatorState } from '../lib/calculatorState';
import { getNormalizedSaveName } from '../lib/calculatorSaveHelpers';
import { deleteSavedCalculation, listSavedCalculations, listSavedCalculationsWithStatus, loadSavedCalculation, renameSavedCalculation, saveCalculation } from '../lib/calculatorSaves';

const Calculator = () => {
    const sortSavedCalculationsNewestFirst = (entries: ReturnType<typeof listSavedCalculations>) => {
      return [...entries].sort((a, b) => {
        const aTime = new Date(a.updatedAt).getTime();
        const bTime = new Date(b.updatedAt).getTime();
        if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
        return bTime - aTime;
      });
    }

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
  const [savedCalculations, setSavedCalculations] = React.useState<ReturnType<typeof listSavedCalculations>>([]);
  const [editingSaveId, setEditingSaveId] = React.useState('');
  const [draftNamesById, setDraftNamesById] = React.useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    const result = listSavedCalculationsWithStatus();
    const sortedEntries = sortSavedCalculationsNewestFirst(result.entries);
    setSavedCalculations(sortedEntries);
    const initialDrafts: Record<string, string> = {};
    for (const entry of sortedEntries) {
      initialDrafts[entry.id] = entry.name;
    }
    setDraftNamesById(initialDrafts);
  }, []);

  const reset = () => dispatch({ type: 'RESET' });

  const getDefaultSaveName = (state: CalculaterState): string => {
    const totalDough = Math.round(state.totalDough.value);
    const hydration = Math.round(state.hydration.value);
    return `Brot ${totalDough} g @ ${hydration}%`;
  }

  const formatSavedDateTime = (isoDateTime: string): { date: string; time: string } => {
    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) {
      return { date: isoDateTime, time: '' };
    }

    const datePart = date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    const timePart = date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return { date: datePart, time: timePart };
  }

  const getSavedSummary = (state: CalculaterState) => {
    const totalDough = Math.round(state.totalDough.value);
    const hydration = Math.round(state.hydration.value);
    const flour = Math.round(state.flour.value);
    const starter = Math.round(state.starter.value);
    const water = Math.round(state.water.value);
    const salt = Math.round(flour * 0.02);

    return {
      totalDough,
      hydration,
      flour,
      starter,
      water,
      salt,
    };
  }

  const handleSave = () => {
    const normalizedName = getDefaultSaveName(fields);

    const savedEntry = saveCalculation(normalizedName, fields);
    const refreshed = listSavedCalculations();
    setSavedCalculations(sortSavedCalculationsNewestFirst(refreshed));
    setDraftNamesById((previous) => ({ ...previous, [savedEntry.id]: savedEntry.name }));
  }

  const handleRenameSave = (id: string) => {
    const current = savedCalculations.find((entry) => entry.id === id);
    if (!current) {
      return;
    }

    const draftName = draftNamesById[id] ?? current.name;
    const normalizedName = getNormalizedSaveName(draftName);
    if (!normalizedName) {
      return;
    }

    const renamed = renameSavedCalculation(id, normalizedName);
    if (!renamed) {
      return;
    }

    const refreshed = listSavedCalculations();
    setSavedCalculations(sortSavedCalculationsNewestFirst(refreshed));
    setDraftNamesById((previous) => ({ ...previous, [id]: normalizedName }));
    setEditingSaveId('');
  }

  const handleLoad = (id: string) => {
    const loaded = loadSavedCalculation(id);
    if (!loaded) {
      return;
    }
    dispatch({ type: 'RESTORE_STATE', state: loaded });
  }

  const handleDelete = (id: string) => {
    const deleted = deleteSavedCalculation(id);
    if (!deleted) {
      return;
    }
    const refreshed = listSavedCalculations();
    setSavedCalculations(sortSavedCalculationsNewestFirst(refreshed));
    setDraftNamesById((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    if (editingSaveId === id) {
      setEditingSaveId('');
    }
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
        <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
          <button type="button" className='btn btn-sm btn-outline-primary' onClick={reset}>alles zrüggsetze</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>Aktuelli Rechnig speichere</button>
        </div>
        <div className="card mb-3">
          <div className="card-header btn-primary">
            Gspeichereti Rechnige
          </div>
          <div className="card-body">
            <div className="saved-calc-list d-flex flex-column gap-2">
              {savedCalculations.length === 0 && (
                <p className="mb-0 text-start text-muted">No kei Rechnige gspeicheret.</p>
              )}
              {savedCalculations.map((entry) => (
                <div key={entry.id} className="saved-calc-box">
                  {(() => {
                    const summary = getSavedSummary(entry.snapshot.payload);
                    const draftName = draftNamesById[entry.id] ?? entry.name;
                    const isDirty = getNormalizedSaveName(draftName) !== getNormalizedSaveName(entry.name);
                    const savedAt = formatSavedDateTime(entry.updatedAt);

                    return (
                      <>
                  <div className="saved-calc-header d-flex justify-content-between align-items-start gap-2">
                    <div className="flex-grow-1 text-center fw-semibold">
                      {editingSaveId === entry.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={draftNamesById[entry.id] ?? entry.name}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDraftNamesById((previous) => ({ ...previous, [entry.id]: value }));
                          }}
                          onBlur={() => setEditingSaveId('')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleRenameSave(entry.id);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none text-dark fw-semibold saved-calc-title-trigger"
                          onClick={() => setEditingSaveId(entry.id)}
                        >
                          <span className="saved-calc-title-text">{draftNamesById[entry.id] ?? entry.name}</span>
                          <i className="fa-solid fa-pen ms-2 saved-calc-edit-icon" aria-hidden="true"></i>
                        </button>
                      )}
                    </div>
                    <small className="saved-calc-time">
                      <span className="saved-calc-time__icon" aria-hidden="true">🕒</span>
                      <span className="saved-calc-time__text">
                        <span className="saved-calc-time__date">{savedAt.date}</span>
                        <span className="saved-calc-time__time">{savedAt.time}</span>
                      </span>
                    </small>
                  </div>
                  <div className="saved-calc-summary mt-2 small row g-1 text-center">
                    <div className="col-4 col-md-2"><span className="d-inline-block text-nowrap">⚖️ {summary.totalDough}g</span></div>
                    <div className="col-4 col-md-2"><span className="d-inline-block text-nowrap">💧 {summary.hydration}%</span></div>
                    <div className="col-4 col-md-2"><span className="d-inline-block text-nowrap">🌾 {summary.flour}g</span></div>
                    <div className="col-4 col-md-2"><span className="d-inline-block text-nowrap">🚰 {summary.water}g</span></div>
                    <div className="col-4 col-md-2"><span className="d-inline-block text-nowrap">🫙 {summary.starter}g</span></div>
                    <div className="col-4 col-md-2"><span className="d-inline-block text-nowrap">🧂 {summary.salt}g</span></div>
                  </div>
                  <div className="saved-calc-actions d-flex justify-content-end gap-2 mt-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        if (isDirty) {
                          handleRenameSave(entry.id);
                          return;
                        }
                        handleLoad(entry.id);
                      }}
                    >
                      {isDirty ? (
                        <><i className="fa-solid fa-floppy-disk me-1" aria-hidden="true"></i>Spichere</>
                      ) : (
                        <><i className="fa-solid fa-download me-1" aria-hidden="true"></i>Lade</>
                      )}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(entry.id)} aria-label="Lösche Speicherstand">
                      <i className="fa-solid fa-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>

    </>
  );
};

export default Calculator;