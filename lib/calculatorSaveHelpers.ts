export function getNormalizedSaveName(name: string): string {
  return name.trim();
}

export function hasDuplicateSaveName(name: string, existingNames: string[]): boolean {
  const normalized = getNormalizedSaveName(name).toLowerCase();
  if (!normalized) return false;
  return existingNames.some((existing) => existing.trim().toLowerCase() === normalized);
}
