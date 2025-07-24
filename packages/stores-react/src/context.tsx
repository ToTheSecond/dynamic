import { createContext, useContext } from 'react';

import type { StoresType } from '@tts/stores';
import type { PropsWithChildren } from 'react';
import type { CreateUseContext } from './hooks';

export interface IStoreProviderProps<Stores extends StoresType>
  extends PropsWithChildren {
  stores: Stores;
}

export function createStoreContext<Stores extends StoresType>(
  createUseContext: CreateUseContext,
  stores: Stores,
) {
  const StoreContext = createContext(null as unknown as StoresType);
  const useStores = createUseContext(stores);

  const StoreProvider: React.FC<PropsWithChildren> = ({ children }) => (
    <StoreContext.Provider value={useStores()}>
      {children}
    </StoreContext.Provider>
  );

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
