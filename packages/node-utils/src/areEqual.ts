export type AreFunctionsEqual<Type extends Function = Function> = (
  fn1: Type,
  fn2: Type,
  depth: number,
  key: string,
) => boolean;

export type AreEqualOptions = {
  /**
   * Determines whether or not to fully evaluate functions according to their
   * string representation, or to just check if the functions share the same
   * reference in memory. This option may be configured as a global setting,
   * or an array, for which each index represents a given depth, and the final
   * member of the array is used thereafter.
   */
  functions: FunctionEvaluation | Array<FunctionEvaluation>;
  /**
   * The maximum depth to which the algorithm will recursively evaluate nested
   * properties before defaulting to a simple `Object.is` check. By default,
   * there is no limit.
   */
  maxDepth: number;
  /**
   * Strict asserts a tripple equals check, such that `undefined` is not equal
   * to `null`, and `'1'` is not equal to `1`.
   */
  strict: boolean;
};

export type FunctionEvaluation = 'basic' | 'full' | 'none' | AreFunctionsEqual;

/**
 * Normalize the incoming functions option, such that it applies to the places
 * where its usage is needed.
 *
 */
function evaluateFunctions(
  [checking]: FunctionEvaluation[],
  prev: Function,
  next: Function,
  depth: number,
  key: string,
) {
  switch (checking) {
    case 'basic':
      return Object.is(prev, next);
    case 'full':
      return (
        (prev.toString() || String(prev)) == (next.toString() || String(next))
      );
    case 'none':
    case undefined:
      return true;
    default:
      return checking(prev, next, depth, key);
  }
}

/**
 * Normalize the incoming functions option, such that it applies to the places
 * where its usage is needed.
 */
function functionsOf(
  functions: FunctionEvaluation | Array<FunctionEvaluation> = [],
  slice?: boolean,
): FunctionEvaluation[] {
  const nextOptions = Array.isArray(functions) ? functions : [functions];

  return slice && nextOptions.length > 1 ? nextOptions.slice(1) : nextOptions;
}

/**
 * Applies an adjustable equality checking algorithm over two incoming values,
 * such that even functions can be compared.
 */
export function areEqual<Type>(
  prev: Type,
  next: Type,
  options: Partial<AreEqualOptions> = {},
  depth: number = -1,
  key: string = '',
): boolean {
  if (typeof prev !== typeof next) return false;

  switch (typeof prev) {
    case 'function':
      return evaluateFunctions(
        functionsOf(options.functions),
        prev,
        next as typeof prev,
        depth + 1,
        key,
      );

    case 'object':
      if (prev === null || next === null) return prev === next;

      const entries = Object.entries(prev);

      if (options.maxDepth && depth >= options.maxDepth)
        return Object.is(prev, next);

      return (
        entries.length === Object.values(next as object).length &&
        entries.every(([key, value]) =>
          areEqual(
            value,
            (next as Type)[key as keyof Type],
            // NOTE:
            // This utility preferences a 'shallow comparison' when it comes to
            // functions, such that root properties of an object are compared
            // equally to a scenario where this utility is called on functions
            // themselves as values to be compared; hene, changes to options do
            // not apply when depth is zero.
            {
              ...options,
              functions: functionsOf(options.functions, depth > -1),
            },
            depth + 1,
            key,
          ),
        )
      );

    case 'symbol':
      return Object.is(prev, next);

    default:
      return options.strict ? prev === next : prev == next;
  }
}
