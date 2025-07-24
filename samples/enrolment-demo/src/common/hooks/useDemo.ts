// Package Imports
import { createUseSelectorWithProps, useStores } from '../stores';

export const useDemo = createUseSelectorWithProps(useStores, (
  stores,
  props: { role: string },
  { runInAction },
) => ({
  onClick: runInAction(() => {
    stores.appStore.addRole(`${props.role} ${stores.uiStore.state.count}`);
    stores.uiStore.increment();
  }),
  isMultipleOf4: stores.uiStore.isMultipleOf4,
}));
