import { describe, expect, it } from 'vitest';
import { getNormalizedSaveName, hasDuplicateSaveName } from './calculatorSaveHelpers';

describe('calculatorSaveHelpers', () => {
  it('normalizes user entered save name', () => {
    expect(getNormalizedSaveName('  Weekend Loaf  ')).toBe('Weekend Loaf');
    expect(getNormalizedSaveName('   ')).toBe('');
  });

  it('detects duplicate save names case-insensitively', () => {
    const names = ['Daily Mix', 'Weekend Loaf'];

    expect(hasDuplicateSaveName('daily mix', names)).toBe(true);
    expect(hasDuplicateSaveName('WEEKEND LOAF', names)).toBe(true);
    expect(hasDuplicateSaveName('New Name', names)).toBe(false);
  });
});
