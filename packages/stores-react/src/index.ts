// Project Imports
import * as $stores from '@cimanyd/stores';
import createInitializerFactory from './initialize';
import createHelpersFactory from './helpers';
import createHooksFactory from './hooks';

// Type Imports
import type { $Stores, CreateStore, ComputedDecorator } from '@cimanyd/stores';
import type { CreateSubscription, createSubscriptions } from './helpers';
import type {
  CreateUseSelectorWithProps,
  CreateUseSelector,
  CreateUseStore,
  CreateUseStores,
} from './hooks';
import type { CreateInitializer, Initialize } from './initialize';

interface Stores<StoreId extends string, CompareOptions extends unknown[]> {
  computed: ComputedDecorator<StoreId, CompareOptions>;
  createInitializer: CreateInitializer;
  createSubscription: CreateSubscription;
  createSubscriptions: createSubscriptions;
  createUseSelector: CreateUseSelector;
  createUseSelectorWithProps: CreateUseSelectorWithProps;
  createUseStore: CreateUseStore;
  createUseStores: CreateUseStores;
  initialize: Initialize;
  Store: $Stores<StoreId, CompareOptions>['Store'];
}

interface CreateConnectedStore<
  StoreId extends string,
  CompareOptions extends unknown[],
> extends CreateStore<StoreId, CompareOptions> {
  withActions: boolean;
}

export function define<
  StoreId extends string,
  CompareOptions extends unknown[],
>(
  options: Partial<CreateConnectedStore<StoreId, CompareOptions>> = {},
): Stores<StoreId, CompareOptions> {
  // Extract the incoming options (if provided);
  const { withActions, ...config } = options;

  // Pass in the config for the `define` function.
  const stores = $stores.define(config) as $Stores<StoreId, CompareOptions>;

  // Extract the `Store` class and `computed` decorator.
  const { Store, computed } = stores;

  // Create the helpers, hooks, and initializer!
  const createHelpers = createHelpersFactory(stores);
  const createAllHooks = createHooksFactory(stores, withActions);
  const createInitializer = createInitializerFactory(stores, createAllHooks);

  // Remove from `createAllHooks`, those which should not be exposed externally
  // and combine the rest into a subset to be exposed.
  const {
    createUseContext: _ignoreCreateUseContext,
    createUseSelector,
    createUseSelectorWithProps,
    createUseStore,
    createUseStores,
  } = createAllHooks;

  // Return the React-ready exports.
  return {
    ...createHelpers,
    ...createInitializer,
    computed,
    createUseSelector,
    createUseSelectorWithProps,
    createUseStore,
    createUseStores,
    Store,
  };
}

export type {
  ConnectionState as Connection,
  SelectFrom,
  Subscribe,
  UseStore,
  UseStores,
} from './types';
