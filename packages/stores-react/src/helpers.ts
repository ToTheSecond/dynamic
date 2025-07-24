import type {
  $Stores,
  StoreInstance,
  StoresType,
  Subscribe,
} from '@tts/stores';

export default function createHelpers<
  StoreId extends string,
  CompareOptions extends unknown[],
>($stores: $Stores<StoreId, CompareOptions>) {
  function createSubscription<Store extends StoreInstance>(
    store: Store,
  ): Subscribe<Store> {
    // Process the store methods for this instance.
    const [subscribe] = $stores.__storeMethods(store, false);

    // Return the subscription.
    return subscribe;
  }

  function createSubscriptions<Stores extends StoresType>(
    storesRecord: Stores,
  ): Subscribe<Stores> {
    // Produce the `subscribe`helper for these stores.
    const [subscribe] = $stores.__storesMethods(storesRecord, false);

    // Return the connected stores hook.
    return subscribe;
  }

  return {
    /**
     * Returns a callback for subscribing to updates originating from the given
     * store. The subscription function itself returns a callback for removing
     * the subscription.
     */
    createSubscription,
    /**
     * Returns a callback for subscribing to updates originating from any of
     * the given stores. The subscription function itself returns a callback
     * for removing the subscription.
     */
    createSubscriptions,
  };
}

export type CreateSubscription = <Store extends StoreInstance>(
  store: Store,
) => Subscribe<Store>;

export type createSubscriptions = <Stores extends StoresType>(
  storesRecord: Stores,
) => Subscribe<Stores>;
