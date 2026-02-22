import { describe, expect, it } from 'vitest';
import { getCalculatorSaveUiState } from './calculatorSaveUiState';

describe('getCalculatorSaveUiState', () => {
  it('disables all selection-dependent actions when no save is selected', () => {
    const state = getCalculatorSaveUiState({
      saveName: 'My Save',
      renameName: '',
      selectedSaveId: '',
    });

    expect(state.canSave).toBe(true);
    expect(state.canLoad).toBe(false);
    expect(state.canOverwrite).toBe(false);
    expect(state.canDelete).toBe(false);
    expect(state.canRename).toBe(false);
  });

  it('enables actions only with required inputs', () => {
    const state = getCalculatorSaveUiState({
      saveName: 'New Name',
      renameName: 'Renamed',
      selectedSaveId: 'abc123',
    });

    expect(state.canSave).toBe(true);
    expect(state.canLoad).toBe(true);
    expect(state.canOverwrite).toBe(true);
    expect(state.canDelete).toBe(true);
    expect(state.canRename).toBe(true);
  });

  it('disables save/rename for whitespace-only names', () => {
    const state = getCalculatorSaveUiState({
      saveName: '   ',
      renameName: '   ',
      selectedSaveId: 'abc123',
    });

    expect(state.canSave).toBe(false);
    expect(state.canRename).toBe(false);
  });
});
