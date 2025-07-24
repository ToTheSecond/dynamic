// Project Imports
import { useMemo, useSyncExternalStore } from 'react';

// Type Imports
import type {
  $Stores,
  AreStatesEqualSettings,
  StoreClass,
  StoreInstance,
  StoresType,
} from '@cimanyd/stores';
import type { AccessTo, AnySelectFunction, HookSettings, Safe } from './types';

const defaultSettings: AreStatesEqualSettings = {
  functions: ['none', 'none', 'basic'],
  maxDepth: 2,
  strict: true,
};

function accessIgnored(keys: string[]) {
  switch (keys.length) {
    case 0:
      return;
    case 1:
      return `Property '${keys[0]}' is not a store`;
    default:
      return `Properties '${keys.join("', '")}' are not stores`;
  }
}

export function createConnection<
  StoreId extends string,
  CompareOptions extends unknown[],
>($stores: $Stores<StoreId, CompareOptions>, withActions: boolean = true) {
  function accessInstance(storeClass: StoreClass): StoreInstance {
    const [valid, instance] = $stores.__instances(storeClass);

    if (valid) return instance;

    throw Error(
      `Cannot accesss \`${storeClass.constructor.name}\` because no instances of it exist. `,
    );
  }

  function accessRecord<Source>(source: Source) {
    if (source && typeof source !== 'object') return undefined;

    const ignore = [];
    const stores: StoresType = {};

    for (const [key, store] of Object.entries(source as StoresType)) {
      if (store instanceof $stores.Store) {
        stores[key] = store;
      } else {
        ignore.push(key);
      }
    }

    const warning = accessIgnored(ignore);

    if (warning) {
      console.warn(`${warning}, and will be ignored in hook subscriptions.`);
    }

    return Object.keys(stores).length > 0 ? stores : undefined;
  }

  function accessSourceSafely<Source>(original: Source): AccessTo<Source> {
    const [verified, multiple] = (
      original instanceof $stores.Store
        ? [original, false]
        : $stores.__storeClass(original)
          ? [accessInstance(original), false]
          : [accessRecord(original), true]
    ) as Safe<Source>;

    if (!verified)
      throw Error(
        `No valid store instance${multiple ? 's' : ''} available for access.`,
      );

    if (multiple) {
      // For mulitple stores, allow access to the original sources but prevent
      // changes to the original reference.
      const source = Object.freeze(original);

      return [
        () => source,
        ...$stores.__storesMethods(verified, withActions),
      ] as AccessTo<Source>;
    }

    return [
      () => verified,
      ...$stores.__storeMethods(verified, withActions),
    ] as AccessTo<Source>;
  }

  function createStoreConnection<
    Source,
    Select extends AnySelectFunction<Source, Helpers>,
    Helpers extends object,
  >(
    storeSource: Source,
    sourceSettings: HookSettings,
    initialSelect: Select,
    initialSettings?: HookSettings,
  ) {
    type State = ReturnType<Select>;
    const [getSource, subscribe, runInAction] = accessSourceSafely(storeSource);
    const actionHelpers = { runInAction } as Helpers;
    const configSettings: AreStatesEqualSettings = {
      ...defaultSettings,
      ...sourceSettings,
      ...initialSettings,
    };

    let currentSelect: Select = initialSelect;
    let currentSettings: HookSettings = configSettings;
    let currentState: State;
    let initialState: State;

    function getSettings() {
      return { ...configSettings, ...currentSettings };
    }

    function getSubscription(callback: () => void) {
      // Get the next snapshot value from the select function.
      const nextState = currentSelect(getSource(), actionHelpers);

      // Return if the values are equal.
      if ($stores.__areEqual(currentState, nextState, getSettings())) return;

      // Update the internally stored value.
      currentState = nextState;

      // Trigger the connection's callback.
      callback();
    }

    function onClientSnapshot() {
      return currentState;
    }

    function onServerSnapshot() {
      return initialState;
    }

    function onSubscription(callback: () => void) {
      return subscribe(getSubscription.bind(null, callback));
    }

    // initialize the current state now.
    currentState = initialState = currentSelect(getSource(), actionHelpers);

    // Create an array with the `syncExternalStore` methods.
    const connection = [
      onSubscription,
      onClientSnapshot,
      onServerSnapshot,
    ] as const;

    // Return a function that creates a binding for returning the connection.
    return function storeConnection(select: Select, settings?: HookSettings) {
      currentSelect = select;
      currentSettings = settings;

      return connection;
    };
  }

  function createUseStoreConnection<Source extends StoresType>(
    source: Source,
    initialSettings?: HookSettings,
  ) {
    const storeConnection = createStoreConnection.bind(
      null,
      source,
      initialSettings,
    ) as <
      Select extends AnySelectFunction<Source, Helpers>,
      Helpers extends object = {},
    >(
      select: Select,
      settings?: HookSettings,
    ) => ReturnType<typeof createStoreConnection<Source, Select, Helpers>>;

    function useStoreConnection<
      Select extends AnySelectFunction<Source, Helpers>,
      Helpers extends object = {},
    >(select: Select, settings?: HookSettings) {
      // Create the connection reference for this hook instance.
      const connection = useMemo(
        () => storeConnection<Select, Helpers>(select, settings),
        [],
      );

      // Return the connected state according to the subscription.
      return useSyncExternalStore(
        // Maintains the latest version of the select function's reference.
        ...connection(select, settings),
      );
    }

    return useStoreConnection;
  }

  function createUseStoreContext<Stores extends StoresType>(
    this: (stores: Stores) => Stores,
    stores: Stores,
  ): () => Stores {
    // Get initial stores state, and the subscriber method.
    const initial = $stores.__storesSnapshot(stores);
    const [subscribe] = $stores.__storesMethods(stores, false);

    // Create a variable for storing the current stores state.
    let current = { ...initial };

    function getSubscription(callback: () => void) {
      // Update the internally stored value with the next snapshot.
      current = $stores.__storesSnapshot(stores);

      // Trigger the connection's callback.
      callback();
    }

    function onAddSubscription(callback: () => void) {
      return subscribe(getSubscription.bind(null, callback));
    }

    function onClientSnapshot() {
      return current;
    }

    function onServerSnapshot() {
      return initial;
    }

    return (useSyncExternalStore<Stores>).bind(
      this,
      onAddSubscription,
      onClientSnapshot,
      onServerSnapshot,
    );
  }

  return [
    createUseStoreConnection,
    createUseStoreContext as <Stores>(stores: Stores) => Stores,
  ] as const;
}
