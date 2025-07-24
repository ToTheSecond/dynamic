// Project Imports
import { createStoreContext } from './context';
import { toHookName, toInstanceName } from './utils';

// Type Imports
import type {
  $Stores,
  StoreClass,
  StoreInstance,
  StoresType,
} from '@tts/stores';
import type { PropsWithChildren } from 'react';
import type { CreateAllHooks } from './hooks';
import type { HookSettings, UseContext, UseStore, UseStores } from './types';
import type { ToHookName, ToInstanceName } from './utils';

type StoreHooks<Stores extends Record<string, StoreInstance>> = {
  [Key in Extract<keyof Stores, string> as ToHookName<Key>]: UseStore<
    Stores[Key]
  >;
};

type StoreInstances<Stores extends Record<string, StoreClass | StoreInstance>> =
  {
    [Key in Extract<
      keyof Stores,
      string
    > as ToInstanceName<Key>]: Stores[Key] extends StoreClass
      ? InstanceType<Stores[Key]>
      : Stores[Key] extends StoreInstance
        ? Stores[Key]
        : never;
  };

type EntryOf<T extends object> = { [Key in keyof T]: [Key, T[Key]] }[keyof T];

export default function createInitializerFactory<
  StoreId extends string,
  CompareOptions extends unknown[],
>($stores: $Stores<StoreId, CompareOptions>, createHooks: CreateAllHooks) {
  function initialize<
    Stores extends Record<string, StoreClass | StoreInstance>,
  >(storeKeys: string[], stores: Stores, globalSettings?: HookSettings) {
    type Group = StoreInstances<Stores>;
    type Hooks = StoreHooks<Group>;

    const groupEntries = [] as Array<EntryOf<Group>>;
    const hooksEntries = [] as Array<EntryOf<Hooks>>;
    const ignoredKeys = [] as string[];

    for (const [key, Store] of Object.entries(stores)) {
      let store: StoreInstance | null = null;

      if ($stores.__storeClass(Store)) {
        store = new Store() as StoreInstance;
      } else if (Store instanceof $stores.Store) {
        store = Store;
      }

      // Exit early if the entry is not a store.
      if (store === null) {
        ignoredKeys.push(key);
        continue;
      }

      // Extract from this instance, its name.
      const name = storeKeys.includes(key)
        ? key
        : $stores.__storeConfig(store).name;

      groupEntries.push([toInstanceName(name), store] as EntryOf<Group>);
      hooksEntries.push([
        toHookName(name),
        createHooks.createUseStore(store, globalSettings),
      ] as EntryOf<Hooks>);
    }

    const storesGroup = Object.fromEntries(groupEntries) as unknown as Group;
    const storesHooks = Object.fromEntries(hooksEntries) as unknown as Hooks;

    if (ignoredKeys.length > 0) {
      console.warn(
        `The following keys were ignored from \`initialize\`: ${ignoredKeys}`,
      );
    }

    const useStores = createHooks.createUseStores(storesGroup, globalSettings);
    const context = createStoreContext(
      createHooks.createUseContext,
      storesGroup,
    );

    const StoreProvider =
      context.StoreProvider as React.FC<PropsWithChildren> & {
        useStoreContext: UseContext<Group>;
      };

    return {
      StoreProvider,
      stores: storesGroup,
      ...storesHooks,
      useStores,
    };
  }

  function createInitializer<DefaultStores extends Record<string, StoreClass>>(
    defaultStores: DefaultStores,
    defaultSettings?: HookSettings,
  ) {
    return function initializer<Stores extends Record<string, StoreClass>>(
      stores: Stores,
      globalSettings?: HookSettings,
    ) {
      return initialize(
        Object.keys(defaultStores),
        { ...defaultStores, ...stores },
        { ...defaultSettings, ...globalSettings },
      );
    };
  }

  return {
    /**
     * Returns an `initialize` function that will use default store classes,
     * which may be overriden by extended classes, both overriding those that
     * are provided as defaults, as well as additional stores.
     *
     * **Note**:\
     * This is mainly for larger multi-app solutions where store extension is
     * required. For most cases, the actual `initialize` should suffice.
     */
    createInitializer: createInitializer as CreateInitializer,
    /**
     * Returns all stores as instances within a `stores` property, a hook for
     * each store, a global hook for accessing all stores, and a react context
     * provider that returns snapshots of all stores.
     *
     * **Note**:
     * The context that is exposed by the provider is intended for debugging
     * purposes ONLY. Its state is a snapshot of previous state and may fall
     * out of sync with the actual stores.
     */
    initialize: initialize as Initialize,
  };
}

export type Initialize = <
  Stores extends Record<string, StoreClass | StoreInstance>,
>(
  stores: Stores,
  globalSettings?: HookSettings,
) => StoreInstances<Stores> extends infer Instances extends StoresType
  ? StoreHooks<Instances> & {
      StoreProvider: React.FC<PropsWithChildren> & {
        useStoreContext: UseContext<Instances>;
      };
      stores: Instances;
      useStores: UseStores<Instances>;
    }
  : {};

type ExtendStore<Store extends StoreClass> = {
  new <S extends Store extends StoreClass<infer State> ? State : object>(
    initialState?: Partial<S> | (() => Partial<S>),
    applyOnReset?: boolean,
  ): InstanceType<Store>;
  defaultState(): object;
  isStore: boolean;
};

type ExtendStores<DefaultStores extends Record<string, StoreClass>> = {
  [Key in Exclude<string, keyof DefaultStores>]: StoreClass;
} & {
  [Key in keyof DefaultStores]?: ExtendStore<DefaultStores[Key]>;
};

type InitializeStores<
  DefaultStores extends Record<string, StoreClass>,
  DefinedStores extends Record<string, StoreClass>,
> = StoreInstances<{
  [Key in
    | keyof DefinedStores
    | keyof DefaultStores]: Key extends keyof DefinedStores
    ? DefinedStores[Key]
    : Key extends keyof DefaultStores
      ? DefaultStores[Key]
      : never;
}>;

export type CreateInitializer = <
  DefaultStores extends Record<string, StoreClass>,
>(
  defaultStores: DefaultStores,
  defaultSettings?: HookSettings,
) => <Stores extends ExtendStores<DefaultStores>>(
  stores: Stores,
  globalSettings?: HookSettings,
) => InitializeStores<DefaultStores, Stores> extends infer Instances extends
  StoresType
  ? StoreHooks<Instances> & {
      StoreProvider: React.FC<PropsWithChildren> & {
        useStoreContext: UseContext<Instances>;
      };
      stores: Instances;
      useStores: UseStores<Instances>;
    }
  : {};
