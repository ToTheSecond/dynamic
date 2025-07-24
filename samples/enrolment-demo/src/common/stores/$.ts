import * as stores from '@tts/stores-react';

type StoreId = string & { __id?: 'store' };

export const {
  computed,
  createInitializer,
  createUseSelector,
  createUseSelectorWithProps,
  createUseStore,
  initialize,
  Store,
} = stores.define<StoreId, []>({
  withActions: true,
});
