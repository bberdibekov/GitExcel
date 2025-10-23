// src/taskpane/services/comparison.filters.ts

/**
 * Defines the contract for a semantic comparison filter.
 * Each filter is a self-contained unit of logic that can be
 * applied by the diffing engine.
 */
export interface IComparisonFilter {
  /** A unique identifier used for state management (e.g., in a Set). */
  id: string;
  /** The human-readable label displayed in the UI. */
  label: string;
  /** The monetization tier required to use this filter. */
  tier: 'free' | 'pro';
  /** 
   * The core logic of the filter.
   * @param oldCell The cell data from the starting snapshot.
   * @param newCell The cell data from the ending snapshot.
   * @returns `true` if the cells should be considered "equal" according to this filter.
   */
  apply: (oldValue: string, newValue: string) => boolean;
}

/**
 * A registry of filters that apply to the `value` of a cell.
 * The UI will be dynamically generated from this array.
 * The diffing engine will use the `apply` function from these objects.
 */
export const valueFilters: IComparisonFilter[] = [
  {
    id: 'value_ignore_case',
    label: 'Ignore text case',
    tier: 'pro',
    apply: (oldValue, newValue) => {
      const oldStr = String(oldValue ?? '').trim();
      const newStr = String(newValue ?? '').trim();
      return oldStr.toLowerCase() === newStr.toLowerCase();
    },
  },
  {
    id: 'value_ignore_whitespace',
    label: 'Ignore leading/trailing whitespace',
    tier: 'pro',
    apply: (oldValue, newValue) => {
        const oldStr = String(oldValue ?? '');
        const newStr = String(newValue ?? '');
        return oldStr.trim() === newStr.trim();
    },
  },
  // Future filters could be added here easily, e.g.:
  // {
  //   id: 'value_treat_empty_as_zero',
  //   label: 'Treat empty cells and 0 as the same',
  //   tier: 'pro',
  //   apply: (oldValue, newValue) => {
  //     const oldNorm = (oldValue === '' || oldValue === null) ? 0 : oldValue;
  //     const newNorm = (newValue === '' || newValue === null) ? 0 : newValue;
  //     return Number(oldNorm) === Number(newNorm);
  //   },
  // },
];

// We can define separate registries for different types of comparisons.
// For now, we'll just have a placeholder for formula filters.
export const formulaFilters: IComparisonFilter[] = [
    {
        id: 'formula_ignore_whitespace',
        label: 'Ignore formula whitespace',
        tier: 'pro',
        apply: (oldFormula, newFormula) => {
            const oldStr = String(oldFormula ?? '').replace(/\s/g, '');
            const newStr = String(newFormula ?? '').replace(/\s/g, '');
            return oldStr === newStr;
        },
    },
];