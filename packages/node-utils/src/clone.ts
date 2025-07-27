/**
 * A basic cloning algorithm which creates new objects and arrays, ensuring a
 * change in reference without it being too expensive an operation.
 */
export function clone<T>(source: T): T {
  return (
    source &&
    (typeof source === 'object'
      ? Object.entries(source).reduce(
        (value, [key, next]) => {
          value[key as keyof T] = clone(next);

          return value;
        },
        (Array.isArray(source) ? [] : {}) as T,
      )
      : source)
  );
}
