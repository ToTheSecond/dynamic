import type { StoreEntries, StoreInstance, StoresType } from './types';

const enum Mapping {
  COMPUTED,
  GETTER,
  METHOD,
  PROPERTY,
}

type Descriptor<T = any> = TypedPropertyDescriptor<T> & {
  get: { (): T; isComputed?: boolean };
};

const internalOnly = [
  '$',
  'action',
  'constructor',
  'getState',
  'linked',
  'state',
];

function shouldSkip(property: string) {
  return internalOnly.includes(property) || property.startsWith('#');
}

export function createGetSnapshot<Store extends StoreInstance>(store: Store) {
  // Declare the property type for this function.
  type Property = Extract<keyof Store, string>;

  // Create a placeholder for all the mappings of store methods / values.
  const mappings = [] as Array<[Property, Mapping]>;

  // Determine which properties of the store should be processed.
  const properties = Object.getOwnPropertyNames(store)
    .filter((next): next is Property => !shouldSkip(next))
    .sort(([a], [b]) => (a as string).localeCompare(b as string));

  // Loop through the list of filtered properties.
  for (const property of properties) {
    // Get the `descriptor` for this property, in case it matters.
    const descriptor = (Object.getOwnPropertyDescriptor(store, property) ??
      {}) as Descriptor;

    if (typeof descriptor.get === 'function') {
      // Add this getter, such that its value can be accessed whenever the next
      // snapshot is requested.
      mappings.push([
        property,
        descriptor.get.isComputed ? Mapping.COMPUTED : Mapping.GETTER,
      ]);
    } else if (typeof descriptor.set === 'function') {
      // Ignore exclusive `setters` which do not have `getters`.
    } else {
      mappings.push([
        property,
        typeof store[property] === 'function'
          ? Mapping.METHOD
          : Mapping.PROPERTY,
      ]);
    }
  }

  function getStoreSnapshot(instance: any) {
    const linked = Object.entries(instance.linked);

    // Create a reference object to store the snapshot data.
    const fauxStore = {
      ...(linked.length > 0
        ? {
          linked: Object.fromEntries(
            linked.map(([name, store]) => [
              name,
              Object.getPrototypeOf(store),
            ]),
          ),
        }
        : {}),
      state: { ...instance.state },
    } as any;

    // Cycle through each mapping identified when the store was processed.
    for (const [key, type] of mappings) {
      switch (type) {
        case Mapping.COMPUTED:
        case Mapping.GETTER:
          // For the getter, access the direct value via the descriptor.
          fauxStore[key] = (
            Object.getOwnPropertyDescriptor(instance, key) as Descriptor
          ).get();
          break;
        case Mapping.METHOD:
        case Mapping.PROPERTY:
          // For the
          fauxStore[key] = instance[key];
          break;
      }
    }

    return fauxStore;
  }

  return getStoreSnapshot as (instance: Store) => Store;
}

export function getStoresSnapshot<Stores extends StoresType>(stores: Stores) {
  const snapshots = {} as {
    [Store in keyof Stores]: (instance: Stores[Store]) => Stores[Store];
  };

  for (const [name, store] of Object.entries(stores) as StoreEntries<Stores>) {
    snapshots[name] = createGetSnapshot(store);
  }

  return snapshots;
}
