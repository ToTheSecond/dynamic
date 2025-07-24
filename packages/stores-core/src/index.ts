import type { define } from './Store';

// Key Exports
// ----------------------------------------------------------------------------

export * from './Store';

// Type Exports
// ----------------------------------------------------------------------------

export type { Store, StoreConstructor } from './Base';
export type { AreEqualOptions as AreStatesEqualSettings } from './defaults';
export type {
  ActionType,
  ComputedGet,
  RunInAction,
  Subscribe,
  StoreClass,
  StoreInstance,
  StoresType,
} from './types';

// Prepared Exports
// ----------------------------------------------------------------------------

export type $Stores<
  StoreId extends string = string,
  CompareOptions extends unknown[] = [],
> = ReturnType<typeof define<StoreId, CompareOptions>>;

export type ComputedDecorator<
  StoreId extends string = string,
  CompareOptions extends unknown[] = [],
> = $Stores<StoreId, CompareOptions>['computed'];
