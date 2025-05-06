import {
  RawElement,
  StateDiff,
} from '../repos/SimulationRepository/tenderlyTypes';

// Helper function to find existing diff by key
function findExistingDiffIndex(
  accumulatedStateDiff: StateDiff[],
  diff: StateDiff
): number {
  if (!diff.soltype) return -1;

  const diffKey = `${diff.address}-${diff.soltype.name}`;

  return accumulatedStateDiff.findIndex(
    (item) => item.soltype && `${item.address}-${item.soltype.name}` === diffKey
  );
}

// Helper function to process regular diffs (with complete soltype, original, dirty data)
function processRegularDiff(
  accumulatedStateDiff: StateDiff[],
  diff: StateDiff
): StateDiff[] {
  const existingIndex = findExistingDiffIndex(accumulatedStateDiff, diff);

  if (existingIndex === -1) {
    // New entry - add it to our accumulated state
    accumulatedStateDiff.push(structuredClone<typeof diff>(diff));
  } else {
    // Update existing entry - keep original values, update dirty values

    // Update dirty values
    accumulatedStateDiff[existingIndex].dirty = structuredClone<
      typeof diff.dirty
    >(diff.dirty);

    // Handle raw updates if present
    if (diff.raw) {
      accumulatedStateDiff[existingIndex] = updateRawElements(
        accumulatedStateDiff[existingIndex],
        diff
      );
    }
  }

  return accumulatedStateDiff;
}

// Helper function to update raw elements of a state diff
function updateRawElements(stateDiff: StateDiff, diff: StateDiff): StateDiff {
  if (!diff.raw) return stateDiff;

  if (!stateDiff.raw) {
    stateDiff.raw = structuredClone<typeof diff.raw>(diff.raw);
  } else {
    // Update each raw element, preserving original values
    const updatedRaw = [...stateDiff.raw];

    diff.raw.forEach((rawElement) => {
      const idx = updatedRaw.findIndex((item) => item.key === rawElement.key);

      if (idx === -1) {
        // New raw element
        updatedRaw.push(structuredClone<typeof rawElement>(rawElement));
      } else {
        // Update existing raw element - keep original, update dirty
        updatedRaw[idx] = {
          ...updatedRaw[idx],
          dirty: rawElement.dirty,
        };
      }
    });

    stateDiff.raw = updatedRaw;
  }

  return stateDiff;
}

// Helper function to find and update a raw element in accumulated state diffs
function updateRawElementInAccumulated(
  accumulatedStateDiff: StateDiff[],
  diff: StateDiff,
  rawElement: RawElement
): boolean {
  const foundIndex = accumulatedStateDiff.findIndex(
    (stateDiff) =>
      stateDiff.address === diff.address &&
      stateDiff.raw &&
      stateDiff.raw.some((raw) => raw.key === rawElement.key)
  );

  if (foundIndex !== -1) {
    const stateDiff = accumulatedStateDiff[foundIndex];
    if (!stateDiff?.raw) return false;
    const rawIndex = stateDiff.raw.findIndex(
      (raw) => raw.key === rawElement.key
    );

    // Found matching raw element - update only dirty value
    const newRaw = [...stateDiff.raw];
    newRaw[rawIndex] = {
      ...newRaw[rawIndex],
      dirty: rawElement.dirty,
    };

    accumulatedStateDiff[foundIndex] = {
      ...accumulatedStateDiff[foundIndex],
      raw: newRaw,
    };

    return true;
  }

  return false;
}

// Helper function to process raw-only diffs
function processRawOnlyDiff(
  accumulatedStateDiff: StateDiff[],
  diff: StateDiff
): StateDiff[] {
  if (!diff?.raw || diff.raw.length === 0) return accumulatedStateDiff;

  diff.raw.forEach((rawElement) => {
    const updated = updateRawElementInAccumulated(
      accumulatedStateDiff,
      diff,
      rawElement
    );

    // If no existing entry was updated, create a new one
    if (!updated) {
      const newDiff: StateDiff = {
        address: diff.address,
        soltype: diff.soltype || null,
        original: diff.original || null,
        dirty: diff.dirty || null,
        raw: [structuredClone<typeof rawElement>(rawElement)],
      };

      accumulatedStateDiff.push(newDiff);
    }
  });

  return accumulatedStateDiff;
}

// Helper function to process a single diff
function processSingleDiff(
  accumulatedStateDiff: StateDiff[],
  diff: StateDiff
): StateDiff[] {
  // Handle regular diffs (with complete soltype, original, dirty data)
  if (diff?.soltype && diff?.original && diff?.dirty) {
    return processRegularDiff(accumulatedStateDiff, diff);
  }
  // Handle raw-only diffs (missing soltype, original, or dirty)
  else if (diff?.raw && diff.raw.length > 0) {
    return processRawOnlyDiff(accumulatedStateDiff, diff);
  }

  return accumulatedStateDiff;
}

/**
 * Builds a cumulative state diff from a list of state diffs
 *
 * This function takes an array of state diff arrays (each representing a simulation)
 * and builds a cumulative state that tracks changes across all simulations.
 *
 * The input (stateDiffList) is an array where:
 * - Each element represents a simulation
 * - Each simulation contains an array of state diffs
 *
 * The output is an array where:
 * - Each element represents the cumulative state after processing each simulation
 * - Each cumulative state contains all accumulated diffs up to that point
 *
 * @param {StateDiff[][]} stateDiffList - Array of state diff arrays from simulations
 * @returns {StateDiff[][]} Array of cumulative states after each simulation
 */
export function buildStateDiff(stateDiffList: StateDiff[][]): StateDiff[][] {
  if (stateDiffList.length === 0) return [];

  const cumulativeStateDiff: StateDiff[][] = [];
  // This will store our accumulated state across all simulations
  const accumulatedStateDiff: StateDiff[] = [];

  stateDiffList.forEach((stateDiffs) => {
    // Process each diff in the current simulation
    stateDiffs.forEach((diff) => {
      processSingleDiff(accumulatedStateDiff, diff);
    });

    // Add a deep copy of the current accumulated state to our results
    cumulativeStateDiff.push(
      structuredClone<typeof accumulatedStateDiff>(accumulatedStateDiff)
    );
  });

  return cumulativeStateDiff;
}
