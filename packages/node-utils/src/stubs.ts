import { randomString36 } from './randomString';

/** Placeholder function where an async function is expected. */
export const asyncStub = (() => Promise.resolve(void 0)) as (
  ...args: any[]
) => Promise<any>;

/** Placeholder function where any basic function is expected. */
export const basicStub = (() => void 0) as (...args: any[]) => any;

/** Placeholder error where any error value is expected. */
export const errorStub = new Error('stub');

/**
 * Returns a string according to the algorithm provided (defaultsing to the
 * `randomString36` utility), and casts the result to the target `Id` type.
 */
export function idStub<
  Id extends string,
  Algorithm extends (...args: any[]) => string = (...args: any[]) => string,
>(algorithm = randomString36 as Algorithm) {
  return algorithm() as Id;
}

/** Placeholder promise where any promise value is expected. */
export const promiseStub = Promise.resolve<any>(void 0);
