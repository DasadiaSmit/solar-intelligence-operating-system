export type ParameterGrid<T extends Record<string, unknown>> = {
  [Key in keyof T]: readonly T[Key][];
};

export interface GridSearchResult<TParameters, TResult> {
  parameters: TParameters;
  result: TResult;
  score: number;
}

export function gridSearch<TParameters extends Record<string, unknown>, TResult>(
  grid: ParameterGrid<TParameters>,
  evaluator: (parameters: TParameters) => TResult,
  scorer: (result: TResult, parameters: TParameters) => number,
): Array<GridSearchResult<TParameters, TResult>> {
  const keys = Object.keys(grid) as Array<keyof TParameters>;
  const results: Array<GridSearchResult<TParameters, TResult>> = [];
  const visit = (depth: number, parameters: Partial<TParameters>): void => {
    if (depth === keys.length) {
      const complete = parameters as TParameters;
      const result = evaluator(complete);
      results.push({ parameters: complete, result, score: scorer(result, complete) });
      return;
    }
    const key = keys[depth];
    if (key === undefined) return;
    for (const value of grid[key]) visit(depth + 1, { ...parameters, [key]: value });
  };
  visit(0, {});
  return results.sort((a, b) => b.score - a.score);
}

export interface ParetoObjective<T> {
  value: (candidate: T) => number;
  direction: "maximize" | "minimize";
  tolerance?: number;
}

export function paretoFront<T>(
  candidates: readonly T[],
  objectives: readonly ParetoObjective<T>[],
): T[] {
  return candidates.filter((candidate, candidateIndex) => {
    return !candidates.some((other, otherIndex) => {
      if (candidateIndex === otherIndex) return false;
      let atLeastAsGood = true;
      let strictlyBetter = false;
      for (const objective of objectives) {
        const tolerance = objective.tolerance ?? 1e-9;
        const candidateValue = objective.value(candidate);
        const otherValue = objective.value(other);
        const signedDifference = objective.direction === "maximize"
          ? otherValue - candidateValue
          : candidateValue - otherValue;
        if (signedDifference < -tolerance) atLeastAsGood = false;
        if (signedDifference > tolerance) strictlyBetter = true;
      }
      return atLeastAsGood && strictlyBetter;
    });
  });
}
