type CalculatorSaveUiStateInput = {
  saveName: string;
  renameName: string;
  selectedSaveId: string;
};

type CalculatorSaveUiState = {
  canSave: boolean;
  canLoad: boolean;
  canOverwrite: boolean;
  canDelete: boolean;
  canRename: boolean;
};

export function getCalculatorSaveUiState(input: CalculatorSaveUiStateInput): CalculatorSaveUiState {
  const hasSelection = input.selectedSaveId.trim().length > 0;
  const hasSaveName = input.saveName.trim().length > 0;
  const hasRenameName = input.renameName.trim().length > 0;

  return {
    canSave: hasSaveName,
    canLoad: hasSelection,
    canOverwrite: hasSelection,
    canDelete: hasSelection,
    canRename: hasSelection && hasRenameName,
  };
}
