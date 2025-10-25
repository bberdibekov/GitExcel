// src/taskpane/features/comparison/services/comparison-paywall.service.ts

import { IChangeset } from "../../../types/types";
import { ILicense } from "../../../core/services/AuthService";
import { valueFilters, formulaFilters } from "./comparison.filters";

const PARTIAL_RESULT_COUNT = 2;

let proFilterIds: Set<string> | null = null;
function getProFilterIds(): Set<string> {
    if (proFilterIds === null) {
        const allFilters = [...valueFilters, ...formulaFilters];
        proFilterIds = new Set(
            allFilters.filter(f => f.tier === 'pro').map(f => f.id)
        );
    }
    return proFilterIds;
}

/**
 * Applies business logic rules to a changeset based on the user's license.
 * Specifically, it truncates results if a free user is using a Pro filter.
 * @returns The same changeset, potentially mutated with paywall restrictions.
 */
export function applyPaywall(
  changeset: IChangeset,
  license: ILicense,
  activeFilterIds: Set<string>
): IChangeset {
  const proFilters = getProFilterIds();
  
  let isProFilterActive = false;
  activeFilterIds.forEach(id => {
    if (proFilters.has(id)) {
      isProFilterActive = true;
    }
  });

  if (license?.tier === 'free' && isProFilterActive && changeset.modifiedCells.length > PARTIAL_RESULT_COUNT) {
    const originalCount = changeset.modifiedCells.length;
    changeset.modifiedCells = changeset.modifiedCells.slice(0, PARTIAL_RESULT_COUNT);
    changeset.isPartialResult = true;
    changeset.hiddenChangeCount = originalCount - PARTIAL_RESULT_COUNT;
  }

  return changeset;
}