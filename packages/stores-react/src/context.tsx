import { createContext, useContext, useEffect, useState } from 'react';

import type { StoresType } from '@cimanyd/stores';
import type { PropsWithChildren } from 'react';
import type { CreateUseContext } from './hooks';
import type { ToInstanceName } from './utils';

export type StoreProviderProps<Key extends number | string | symbol> =
  PropsWithChildren<{
    fallback?: React.ReactNode;
    skipWaiting?: boolean | Array<ToInstanceName<Extract<Key, string>>>;
  }>;

export function createStoreContext<Stores extends StoresType>(
  createUseContext: CreateUseContext,
  mountStore: (store: string) => Promise<void>,
  stores: Stores,
) {
  const StoreContext = createContext(null as unknown as StoresType);
  const useStores = createUseContext(stores);
  type StoreKey = ToInstanceName<Extract<keyof Stores, string>>;

  const StoreProvider: React.FC<StoreProviderProps<StoreKey>> = ({
    children,
    fallback = null,
    skipWaiting = false,
  }) => {
    const [ready, setReady] = useState(skipWaiting === true);
    const snapshot = useStores();

    useEffect(() => {
      // Create a validator which skips the specified stores from awaiting.
      const validate = Array.isArray(skipWaiting)
        ? (p: Promise<any>, key: string) =>
            !(skipWaiting as string[]).includes(key) && p
        : (p: Promise<any>) => !skipWaiting && p;

      // Mount each of the stores via its `onMount` method.
      const promises = Object.keys(snapshot)
        .map((key) => validate(mountStore(key), key))
        .filter((next) => next);

      // Once all promises have concluded, set the provided to `ready`.
      Promise.allSettled(promises).then(() => setReady(true));
    }, []);

    return (
      <StoreContext.Provider value={snapshot}>
        {ready ? children : fallback}
      </StoreContext.Provider>
    );
  };

  function useStoreContext<Stores extends StoresType>() {
    const context = useContext(StoreContext);

    if (context === null) {
      throw Error(
        'Cannot access a `StoreContext` that has not been instantiated through the `StoreProvider`',
      );
    }

    return context as Stores;
  }

  return {
    StoreProvider,
    useStoreContext,
  };
}
