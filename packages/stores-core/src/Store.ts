// oxlint-disable no-duplicate-enum-values
import bank from './bank';
import * as mutative from 'mutative';
import { Store } from './Base';
import * as defaults from './defaults';
import {
  ActionType,
  ComputedGet,
  RunInAction,
  Subscribe,
  StoreInstance,
  StoresType,
  StoreClass,
} from './types';
import { createGetSnapshot } from './utils';

const enum GlobalKeys {
  GETTERS,
  LISTENERS,
  NAME_ID,
  QUEUE,
  STORES,
  SNAPSHOTS,
}

const enum StoreKeys {
  CONFIG,
  CURRENT,
  DEFAULT,
  GETTERS,
  LISTENERS,
  PENDING,
  PREVIOUS,
  REGISTER,
}

const enum MetaData {
  // The indexes for `IStores[StoreKeys.CONFIG]`
  STORE_ID = 0,
  STORE_NAME = 1,

  // The indexes for `IStores[StoreKeys.CONFIG]`
  STORE_CLASS = 0,
  STORE_INSTANCE = 1,
}

interface IStore<StoreId extends string, State extends object> {
  [StoreKeys.CONFIG]: [StoreId, string];
  [StoreKeys.CURRENT]: State;
  [StoreKeys.DEFAULT]: State | (() => State);
  [StoreKeys.GETTERS]: Array<(store: StoreInstance<State>) => void>;
  [StoreKeys.LISTENERS]: Array<(store: StoreInstance<State>) => void>;
  [StoreKeys.PENDING]: State | undefined;
  [StoreKeys.PREVIOUS]: State | undefined;
  [StoreKeys.REGISTER]: (
    listener: (store: StoreInstance<State>) => void,
  ) => () => void;
}

interface IGlobal<
  StoreId extends string,
  Stores extends StoresType = StoresType,
> {
  [GlobalKeys.GETTERS]: Array<(stores: Stores, queue: StoreId[]) => void>;
  [GlobalKeys.LISTENERS]: Array<(stores: Stores, queue: StoreId[]) => void>;
  [GlobalKeys.NAME_ID]: Record<string, StoreId>;
  [GlobalKeys.STORES]: Record<StoreId, StoreInstance>;
  [GlobalKeys.SNAPSHOTS]: Record<
    StoreId,
    (instance: StoreInstance) => StoreInstance
  >;
}

export interface CreateStore<
  StoreId extends string,
  CompareOptions extends unknown[],
> {
  areEqual(prev: object, next: object, ...args: CompareOptions): boolean;
  assignId(name: string, instance: StoreInstance): StoreId;
  clone<T>(value: T): T;
  onErrors(...args: unknown[]): void;
}

// Declare a non-abstract version of a store for the sole purpose of predicate
// type inference.
class StoreType<State extends object> extends Store<State> {}

// Keys to be ignored when method binding.
const ignoreList = ['constructor', '__isLocked', 'state'];

export function define<
  StoreId extends string,
  CompareOptions extends unknown[],
>(options: Partial<CreateStore<StoreId, CompareOptions>> = {}) {
  // Create the global stores reference.
  const s = [] as object as IGlobal<StoreId>;

  // Deconstruct the incoming options (if provided).
  const { areEqual, assignId, clone, onErrors } = {
    ...defaults,
    ...options,
  } as CreateStore<StoreId, CompareOptions>;

  // Initialize the global stores data.
  s[GlobalKeys.GETTERS] = [] as Array<(stores: StoresType) => void>;
  s[GlobalKeys.LISTENERS] = [] as Array<(stores: StoresType) => void>;
  s[GlobalKeys.NAME_ID] = {} as Record<string, StoreId>;
  s[GlobalKeys.STORES] = {} as Record<StoreId, StoreInstance>;
  s[GlobalKeys.SNAPSHOTS] = {} as Record<
    StoreId,
    (instance: StoreInstance) => StoreInstance
  >;

  const [
    isResourceLocked,
    _listenerRegister,
    _resourceRegister,
    runActionViaLock,
  ] = bank<StoreId>(function onCheckLocks(ids) {
    const queue = ids.filter(
      (id) => typeof id !== 'number' && !isResourceLocked(id),
    ) as StoreId[];

    // Finally, Pipe the IDs of all pending stores to the publish flow.
    if (queue.length > 0) publish(...queue);
  }, true);

  function addGlobalListener(
    domain: GlobalKeys.GETTERS | GlobalKeys.LISTENERS,
    listener: (stores: StoresType) => void,
  ) {
    // Register the listener at the global level for when all stores update.
    s[domain].push(listener);

    // Return a function which ensures the removal of this registration.
    return function removeGlobalListener() {
      s[domain] = s[domain].filter((next) => next !== listener);
    };
  }

  function addStoreListener<Type>(
    store: $Store,
    domain: StoreKeys.GETTERS | StoreKeys.LISTENERS,
    listener: (store: Type) => void,
  ) {
    // Register the listener among those for the specific store's own updates.
    store.$[domain].push(listener as (store: StoreInstance) => void);

    // Return a function for removing the store.
    return function removeStoreListener() {
      store.$[domain] = store.$[domain].filter(
        (next) => next !== (listener as (store: StoreInstance) => void),
      );
    };
  }

  function areLocked(...ids: StoreId[]) {
    return ids.every((id) => isResourceLocked(id));
  }

  function checkKeys<State extends object>(
    keys: Array<keyof State>,
    a: State,
    b: State,
  ) {
    return keys.every((key) => a[key] === b[key]);
  }

  function decorator_computed<
    Target extends StoreInstance<any>,
    State extends Extract<Target, { getState: () => object }>['getState'],
  >(
    keysToWatch: Array<keyof State>,
    ...options: CompareOptions
  ): ComputedGet<Target>;

  function decorator_computed<Target extends StoreInstance<any>>(
    alwaysCompute: null,
    ...options: CompareOptions
  ): ComputedGet<Target>;

  function decorator_computed<
    Target extends StoreInstance<any>,
    State extends Extract<Target, { getState: () => object }>['getState'],
  >(
    areStatesEqual?: (next: State, prev: State) => boolean,
    ...options: CompareOptions
  ): ComputedGet<Target>;

  function decorator_computed<
    Target extends StoreInstance<any>,
    State extends Extract<Target, { getState: () => object }>['getState'],
  >(
    checkDeps?:
      | ((next: State, prev: State) => boolean)
      | Array<keyof State>
      | null,
    ...options: CompareOptions
  ): ComputedGet<Target> {
    const depsAreEqual = (
      typeof checkDeps === 'object'
        ? checkDeps && checkKeys.bind(null, checkDeps as [])
        : (checkDeps ?? areEqual)
    ) as ((next: State, prev: State) => boolean) | null;

    function decorate(...args: unknown[]) {
      const [prototype, property, descriptor] = args as [
        $Store,
        string,
        PropertyDescriptor,
      ];

      const getter = descriptor.get as () => any;
      const nameOf = prototype.constructor.name;

      // If the decorated function is not a getter, exit early.
      if (!getter)
        throw Error(`No getter function named \`${nameOf}.${property}\`.`);

      const sanityCheckFailure = `A change in \`${nameOf}.getState()\` was detected during the computation of \`${nameOf}.${property}\``;

      // Create a listener for re-computing the cached value.
      function onStoreUpdate(
        this: $Store<any>,
        getValue: () => State,
        setValue: (value: State) => void,
      ) {
        // Get snapshots of the current and previous states.
        const current = this.$[StoreKeys.CURRENT];
        const value = getValue();

        // Determine if there is no need to recompute the cached value.
        if (depsAreEqual && depsAreEqual(current, this.$[StoreKeys.PREVIOUS]))
          return;

        // Otherwise, compute a new result via the original getter.
        const result = getter.apply(this);

        // Check again whether for whether or not the value is effectively
        // changed (based on the `areEqual` algorithm).
        if (areEqual(result, value, ...options)) return;

        // A change is detected, so store the new value
        setValue(result);

        // Perform a final sanity check and exit early if everything is okay.
        if (Object.is(this.$[StoreKeys.CURRENT], current)) return;

        // Otherwise, report this as a potential issue.
        onErrors(sanityCheckFailure);
      }

      // Create a function for initializing the cached value, which overwrites
      // itself after the first call, with the simplified `getValue`, whilst
      // also creating the registration for the store listener.
      function registerComputedValue(this: $Store) {
        let value = getter.apply(this);

        const getValue = () => value;
        const setValue = (next: State) => {
          value = next;
        };

        // Now register the listener to receive store updates.
        addStoreListener(
          this,
          StoreKeys.GETTERS,
          onStoreUpdate.bind(this, getValue, setValue),
        );

        // Then, overrite the getter.
        Object.defineProperty(this, property, { get: getValue });

        // Finally, return the value.
        return value;
      }

      // Finally, overwrite the original getter with the registration.
      descriptor.get = registerComputedValue;
    }

    return decorate;
  }

  function getMeta(store: StoreInstance<any>) {
    const { $ } = store as unknown as $Store;

    return {
      id: $[StoreKeys.CONFIG][MetaData.STORE_ID],
      name: $[StoreKeys.CONFIG][MetaData.STORE_NAME],
    };
  }

  function getStore<State extends object>(
    store: StoreClass<State>,
  ): [MetaData.STORE_CLASS, ...Array<StoreInstance<State>>];

  function getStore<State extends object>(
    store: StoreInstance<State>,
  ): [MetaData.STORE_INSTANCE, StoreInstance<State>];

  function getStore<State extends object>(
    store: StoreClass<State> | StoreInstance<State>,
  ):
    | [MetaData.STORE_CLASS, ...Array<StoreInstance<State>>]
    | [MetaData.STORE_INSTANCE, StoreInstance<State>] {
    if (store instanceof Store) {
      return [MetaData.STORE_INSTANCE, store];
    }

    return [
      MetaData.STORE_CLASS,
      Object.values(s[GlobalKeys.STORES]).filter(
        (next): next is StoreInstance<State> => next instanceof store,
      ),
    ] as unknown as [MetaData.STORE_CLASS, ...Array<StoreInstance<State>>];
  }

  function initializeStore(storeName: string, store: StoreInstance) {
    s[GlobalKeys.NAME_ID][storeName] = (store as $Store).$[StoreKeys.CONFIG][
      MetaData.STORE_ID
    ];
  }

  function instancesOf<State extends object>(
    store: StoreClass<State> | StoreInstance<State>,
    allowMultiple?: false,
  ): [true, StoreInstance<State>] | [false];

  function instancesOf<State extends object>(
    store: StoreClass<State> | StoreInstance<State>,
    allowMultiple: true,
  ): [true, ...Array<StoreInstance<State>>] | [false];

  function instancesOf<State extends object>(
    store: StoreClass<State> | StoreInstance<State>,
    allowMultiple?: boolean,
  ): [boolean, ...Array<StoreInstance<State>>] {
    const [result, ...instances] = getStore(store as StoreClass<State>);

    if (result || instances.length === 1) {
      return [true, ...instances];
    }

    return allowMultiple && instances.length > 0
      ? [true, ...instances]
      : [false];
  }

  function isStoreClass<State extends object>(
    store: StoreClass | unknown,
  ): store is typeof StoreType<State> {
    return (
      typeof store === 'function' &&
      !Object.is(store, store.constructor) &&
      Store.isPrototypeOf(store)
    );
  }

  function isValidMethod(key: string): boolean {
    return !ignoreList.includes(key);
  }

  function membersOf(store: $Store | typeof $Store): string[] {
    return (store.constructor as typeof $Store).isStore
      ? Object.getOwnPropertyNames(store).concat(
          membersOf(Object.getPrototypeOf(store)),
        )
      : [];
  }

  function methodsOf(store: $Store) {
    const members = Array.from(new Set(membersOf(store))).filter(isValidMethod);
    const methods = [] as string[];

    for (const member of members as Array<keyof $Store | string>) {
      try {
        if (typeof store[member as keyof $Store] === 'function') {
          methods.push(member);
        }
      } catch (error) {
        console.warn(
          `Could not access method \`${store.constructor.name}.${member}\``,
          error,
        );
      }
    }

    return methods as Array<keyof $Store>;
  }

  // Create the internal functions used by stores.
  function notify<Args extends unknown[]>(
    listeners: Array<(...update: Args) => void>,
    ...update: Args
  ) {
    for (const listener of listeners) {
      listener(...update);
    }
  }

  // Create the internal functions used by stores.
  function publish(...storeIds: StoreId[]) {
    // First, determine .which stores should be updated.
    const stores = storeIds.map(
      (storeId) => s[GlobalKeys.STORES][storeId],
    ) as $Store[];

    // Cycle through each store to commit its next state and update its own
    // internal getter state(s).
    for (const store of stores) {
      // Rotate the current state into the previous state, and then doing the
      // same for the pending state into the current state. The pending state
      // can then be cleared, marking the state transformation as complete.
      store.$[StoreKeys.PREVIOUS] = store.$[StoreKeys.CURRENT];
      store.$[StoreKeys.CURRENT] = store.$[StoreKeys.PENDING];
      store.$[StoreKeys.PENDING] = undefined;

      // Then, trigger each store's list of getters to keep them up-to-date.
      notify(store.$[StoreKeys.GETTERS], store);
    }

    // Next, trigger the global level listeners.
    notify(
      s[GlobalKeys.LISTENERS],
      Object.fromEntries(
        stores.map((store) => [store.$[StoreKeys.CONFIG][1], store]),
      ),
      storeIds,
    );

    // Finally, trigger the stores explicitly mentioned within this update.
    for (const store of stores) {
      notify(store.$[StoreKeys.LISTENERS], store);
    }
  }

  function queue(store: $Store, clearPrevious?: boolean) {
    // Get the `storeId` from the incoming store.
    const [storeId] = store.$[StoreKeys.CONFIG];

    if (clearPrevious) {
      // HACK: This ensures that right after the new values for each getter has
      // been set, the store removes the "previous" state.
      const unsubscribe = addStoreListener(store, StoreKeys.GETTERS, () => {
        store.$[StoreKeys.PREVIOUS] = undefined;
        store.$[StoreKeys.PENDING] = undefined;
        unsubscribe();
      });
    }

    if (isResourceLocked(storeId)) {
      // If the store is locked, OR, a global lock is set, then register it as
      // a queued store, with changes pending.
      // DO NOTHING: s[GlobalKeys.QUEUE].add(storeId);
    } else {
      // Otherwise, commit the updates to all listeners.
      publish(storeId);
    }
  }

  function rebindAll<
    Properties extends keyof Reference,
    Reference extends object,
  >(
    binding: $Store,
    reference: Reference,
    getProperties: (reference: Reference) => string[],
  ) {
    for (const property of getProperties(reference) as Properties[]) {
      // biome-ignore lint/complexity/noBannedTypes: <explanation>
      (reference[property] as Function) =
        // biome-ignore lint/complexity/noBannedTypes: <explanation>
        (reference[property] as Function).bind(binding);
    }
  }

  function register<State extends object>(
    store: StoreInstance<State>,
    listener: (store: StoreInstance<State>) => void,
  ) {
    // Extract the internal store reference.
    const { $ } = store as unknown as $Store;

    // Attempt to register the listener with this store.
    return $[StoreKeys.REGISTER](listener);
  }

  function storeActions(...storeIds: StoreId[]) {
    const handleInLock = runActionViaLock(...storeIds);

    // Create internal locking function.
    const handleOnDone = () => {
      const updated = storeIds.filter((storeId) => !isResourceLocked(storeId));

      if (updated.length > 0) {
        publish(...updated);
      }
    };

    // Return action handler.
    return function runInAction<Action extends ActionType>(
      action: Action,
      onError?: (error: unknown) => void,
      throws?: boolean,
    ) {
      // Function which returns the action as a bound function.
      return function executeAction(
        this: any,
        ...args: Parameters<typeof action>
      ) {
        handleInLock(
          (action as Function).bind(this, ...args),
          handleOnDone,
          onError,
          throws,
        );
      } as (...args: Parameters<typeof action>) => void;
    };
  }

  function withStoreMethods<
    Target extends StoreInstance,
    WithActions extends boolean,
  >(
    this: any,
    store: Target,
    withActions: WithActions,
  ): [Subscribe<Target>, WithActions extends true ? RunInAction : null] {
    // First, extract the IDs for each store.

    // Next, create a function for registering listeners updates across stores.
    const registerSubscription = register.bind(this, store as Target);

    // Then, create a `runInAction` helper for the stores based on the ids.
    const runInAction = withActions ? storeActions(getMeta(store).id) : null;

    // Finally, return the combined functions.
    return [
      registerSubscription as Subscribe<Target>,
      runInAction as WithActions extends true ? RunInAction : null,
    ];
  }

  function withStoresMethods<
    StoresRecord extends Record<string, StoreInstance>,
    WithActions extends boolean,
  >(
    storesRecord: StoresRecord,
    withActions: WithActions,
  ): [Subscribe<StoresRecord>, WithActions extends true ? RunInAction : null] {
    const values = Object.values(storesRecord);

    // First, extract the IDs for each store.
    const storeIds = values.map((store) => getMeta(store).id);

    // Next, create a function for registering listeners updates across stores.
    function registerSubscriptions(listener: (source: StoresRecord) => void) {
      const subscriptions = values.map((store) =>
        register(store, () => {
          if (areLocked(...storeIds)) return;

          listener(storesRecord);
        }),
      );

      return () => subscriptions.forEach((unsubscribe) => unsubscribe());
    }

    // Then, create a `runInAction` helper for the stores based on the ids.
    const runInAction = withActions ? storeActions(...storeIds) : null;

    // Finally, return the combined functions.
    return [
      registerSubscriptions,
      runInAction as WithActions extends true ? RunInAction : null,
    ];
  }

  function withStoreSnapshots<Target extends StoreInstance>(target: Target) {
    const { id } = getMeta(target);

    if (!s[GlobalKeys.SNAPSHOTS][id]) {
      s[GlobalKeys.SNAPSHOTS][id] = createGetSnapshot(target) as any;
    }

    return s[GlobalKeys.SNAPSHOTS][id](target) as Target;
  }

  function withStoresSnapshot<Stores extends StoresType>(stores?: Stores) {
    const lookup = stores
      ? Object.entries(stores)
      : (Object.values(s[GlobalKeys.STORES]) as StoreInstance[]).map(
          (store) => [getMeta(store).name, store] as const,
        );

    return Object.fromEntries(
      lookup.map(([name, store]) => [name, withStoreSnapshots(store)]),
    ) as Stores;
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  class $Store<State extends object = any> extends Store<State> {
    public static override isStore = true;

    public static override defaultState(name?: string): object {
      throw Error(
        `Static method \`defaultState\` does not exist on \`${name}\`.`,
      );
    }

    public $: IStore<StoreId, State>;

    constructor(
      initialState?: Partial<State> | (() => Partial<State>),
      applyOnReset?: boolean,
    ) {
      super();

      // Create the store's compact internal properties variable;
      const $ = [] as object as IStore<StoreId, State>;
      const S = this.constructor as typeof $Store;

      // Obtain the store prototype, simultaneously determining its name;
      const defaultState = S.defaultState as (name?: string) => State;
      const storeName = S.name;
      const storeId = assignId(storeName, this as never) as StoreId;

      // Create a function for returning new state (both for initialization and
      // for whenever the store resets, should `applyOnReset` be true).
      function newState(): State {
        return {
          ...defaultState(storeName),
          ...(typeof initialState === 'function'
            ? initialState()
            : initialState),
        };
      }

      // Get the `defaultState`
      const currentState = newState();

      // Update the internal properties of this store.
      $[StoreKeys.CONFIG] = [storeId, storeName];
      $[StoreKeys.CURRENT] = currentState;
      $[StoreKeys.DEFAULT] = applyOnReset ? newState : defaultState;
      $[StoreKeys.GETTERS] = [];
      $[StoreKeys.LISTENERS] = [];
      $[StoreKeys.PENDING] = undefined;
      $[StoreKeys.PREVIOUS] = undefined;
      $[StoreKeys.REGISTER] = addStoreListener.bind(
        this,
        this,
        StoreKeys.LISTENERS,
      ) as (listener: (store: StoreInstance<State>) => void) => () => void;

      // Then, set the internal properties within this instance.
      this.$ = $;

      // Next, bind all the methods and getters to this store instance.
      rebindAll(this, this, methodsOf);

      rebindAll(this, $[StoreKeys.GETTERS], Object.keys);

      // Specifically bind the action wrapper.
      this.action = storeActions(storeId);

      // Finally, apply global registrations for top-level operations.
      s[GlobalKeys.STORES][storeId] = this;
      s[GlobalKeys.SNAPSHOTS][storeId] = createGetSnapshot(
        this as StoreInstance,
      );
    }

    protected get __isLocked() {
      return isResourceLocked(this.$[StoreKeys.CONFIG][MetaData.STORE_ID]);
    }

    protected override getState<S extends State>() {
      return this.$[StoreKeys.CURRENT] as S;
    }

    protected override async onMount() {
      // Do nothing;
    }

    public override produce(
      draft: ((state: State) => void) &
        ((state: mutative.Draft<State>) => void),
    ): typeof this {
      const current = this.$[StoreKeys.PENDING] ?? this.$[StoreKeys.CURRENT];

      // Use the `mutative` create method to produce new state via the `draft`.
      const state = mutative.create(current, (prev): void => {
        draft(prev);
        return prev as unknown as void;
      });

      // Now set the state via the "replacement" technique.
      this.setState(state, true);

      // Finally, return this instance for optional chaining.
      return this;
    }

    protected override reset(
      reInitialize?:
        | (((nextState: State, lastState: Readonly<State>) => void) &
            ((
              nextState: mutative.Draft<State>,
              lastState: Readonly<State>,
            ) => void))
        | undefined,
    ): typeof this {
      // Clone the defaulted state so it remains 'pure' and unchanged.
      const current = this.$[StoreKeys.PENDING] ?? this.$[StoreKeys.CURRENT];
      const newState = this.$[StoreKeys.DEFAULT];
      let resetState = clone(
        typeof newState === 'function' ? newState() : newState,
      );

      // Initialize state, taking into account the override if required.
      if (reInitialize) {
        resetState = mutative.create(resetState, (draft) =>
          reInitialize(draft, clone(current)),
        );
      }

      // Now update the state internally and return this store instance.
      this.setState(resetState, true, true);

      // Finally, return this instance for optional chaining.
      return this;
    }

    // implementation
    public override setState(
      nextState: Partial<State> | ((currentState: State) => Partial<State>),
      overwrite?: boolean,
      clearPrevious?: boolean,
    ): typeof this {
      // Capture the old state and determine the incoming new state.
      const current = this.$[StoreKeys.PENDING] ?? this.$[StoreKeys.CURRENT];
      const pending =
        typeof nextState === 'function' ? nextState(current) : nextState;

      // Update the pending state as per the above.
      this.$[StoreKeys.PENDING] = (
        overwrite ? pending : { ...current, ...pending }
      ) as State;

      // Now queue an update.
      queue(this, clearPrevious);

      // Finally, return this instance for optional chaining.
      return this;
    }

    public get state() {
      return this.getState();
    }
  }

  return {
    /** Internal use only. */
    __areEqual: defaults.areEqual,
    /** Internal use only. */
    __areLocked: areLocked,
    /** Internal use only. */
    __instances: instancesOf,
    /** Internal use only. */
    __globalGetter: addGlobalListener.bind(null, GlobalKeys.GETTERS),
    /** Internal use only. */
    __globalListener: addGlobalListener.bind(null, GlobalKeys.LISTENERS),
    /** Internal use only. */
    __initialize: initializeStore,
    /** Internal use only. */
    __storeActions: storeActions,
    /** Internal use only. */
    __storeClass: isStoreClass,
    /** Internal use only. */
    __storeConfig: getMeta,
    /** Internal use only. */
    __storeMethods: withStoreMethods,
    /** Internal use only. */
    __storesMethods: withStoresMethods,
    /** Internal use only. */
    __storeSnapshot: withStoreSnapshots,
    /** Internal use only. */
    __storesSnapshot: withStoresSnapshot,
    /** Internal use only. */
    __UNSAFE_BASE_STORE: Store as any,
    /** Internal use only. */
    __UNSAFE_MAIN_STORE: $Store as any,
    /**
     * A dynamic storage solution for managing state within an application. The
     * `Store` class should be extended from and never used directly!
     */
    Store: $Store as unknown as typeof Store,
    /**
     * A decorator used to make `get` methods reactive only to changes within a
     * store, when those changes affect the getter's result. These values will
     * be pre-computed BEFORE listeners to the store are triggered.
     */
    computed: decorator_computed,
  };
}
