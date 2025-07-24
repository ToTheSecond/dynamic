import { createInitializer } from "./$";
import { AppStore } from "./AppStore";
import { AdvancedUiStore, UiStore } from "./UiStore";

export { createUseSelector, createUseSelectorWithProps } from './$'

// Highly Recommended that a `Stores` type (not interface) be defined for clean
// typescript annotations to propagate throughout the app.
export type Stores = {
  // AdvancedUiStore: typeof AdvancedUiStore;
  AppStore: typeof AppStore;
  UiStore: typeof UiStore;
}

const initializer = createInitializer<Stores>({
  AppStore,
  UiStore,
});

export const {
  StoreProvider,
  useAppStore,
  useUiStore,
  useStores,
  stores,
} = initializer({
  AppStore,
  UiStore: AdvancedUiStore,
});

console.log({ stores })