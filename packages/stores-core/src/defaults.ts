import { areEqual, clone, idStub } from '@cimanyd/node-utils';

/** A basic function for generating a limited range of `Id` strings. */
const assignId = <T extends string>() => idStub<T>();

/** A basic error handler which logs errors to the console as warnings. */
export function onError(err: unknown) {
  console.warn(err);
}

export { areEqual, assignId, clone };
