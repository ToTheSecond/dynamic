// Project Imports
import { createConnection } from './connection';

// Type Imports
import type {
  $Stores,
  StoreClass,
  StoreInstance,
  StoresType,
} from '@tts/stores';
import type {
  HookSettings,
  SelectFrom,
  SelectTarget,
  SourceFor,
  UseContext,
  UseSelector,
  UseStore,
  UseStores,
} from './types';

export default function createHooks<
  StoreId extends string,
  CompareOptions extends unknown[],
>(
  $stores: $Stores<StoreId, CompareOptions>,
  withActions: boolean = true,
): CreateAllHooks {
  // Create the `connectSource` function based on the incoming store config.
  const [createUseStoreConnection, createUseStoreContext] = createConnection(
    $stores,
    withActions,
  );

  /** Creates a React hook for accessing state from a store. */
  function createUseSelector<Target extends SelectTarget, Props, Selection>(
    target: Target,
    select: SelectFrom<
      SourceFor<Target>,
      Selection,
      Props extends object ? Extract<Props, object> : undefined
    >,
  ): UseSelector<
    SourceFor<Target>,
    Props,
    Selection,
    SelectFrom<SourceFor<Target>, Selection>
  > {
    const selectFunction = select as Function;

    function boundSelect(...onCallArgs: any[]) {
      return onCallArgs.length > 2
        ? selectFunction(onCallArgs[1], onCallArgs[0], onCallArgs[2])
        : selectFunction(onCallArgs[0], onCallArgs[1]);
    }

    function useBoundSelect(this: any, ...onPropsArgs: unknown[]) {
      return onPropsArgs.length === 1
        ? boundSelect.bind(this, onPropsArgs[0])
        : boundSelect;
    }

    return useBoundSelect;
  }

  return {
    createUseContext: createUseStoreContext,
    createUseSelector,
    createUseSelectorWithProps: createUseSelector,
    createUseStore: createUseStoreConnection,
    createUseStores: createUseStoreConnection,
  } as CreateAllHooks;
}

export type CreateUseContext = <Stores extends StoresType>(
  stores: Stores,
) => UseContext<Stores>;

export type CreateUseStore = <Store extends StoreClass | StoreInstance>(
  source: Store,
  hookSettings?: HookSettings,
) => Store extends StoreClass
  ? UseStore<InstanceType<Store>>
  : Store extends StoreInstance
    ? UseStore<Store>
    : never;

export type CreateUseStores = <Stores extends StoresType>(
  source: Stores,
  hookSettings?: HookSettings,
) => UseStores<Stores>;

export type CreateUseSelector = <Target extends SelectTarget, Selection>(
  target: Target,
  select: SelectFrom<SourceFor<Target>, Selection, undefined>,
) => UseSelector<
  SourceFor<Target>,
  undefined,
  Selection,
  SelectFrom<SourceFor<Target>, Selection>
>;

export type CreateUseSelectorWithProps = <
  Target extends SelectTarget,
  Props extends object,
  Selection,
>(
  target: Target,
  select: SelectFrom<SourceFor<Target>, Selection, Props>,
) => UseSelector<
  SourceFor<Target>,
  Props,
  Selection,
  SelectFrom<SourceFor<Target>, Selection>
>;

export interface CreateHooks {
  createUseSelector: CreateUseSelector;
  createUseSelectorWithProps: CreateUseSelectorWithProps;
  createUseStore: CreateUseStore;
  createUseStores: CreateUseStores;
}

export interface CreateAllHooks extends CreateHooks {
  createUseContext: CreateUseContext;
}
