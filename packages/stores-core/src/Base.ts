import { Draft } from 'mutative';

const abstractError = new Error(
  'Cannot invoke method of abstract store class.',
);

export abstract class Store<
  State extends object,
  LinkedStores extends { [x: string]: Store<any, any> } = {},
> {
  /**
   * A static property used to determine whether this is a store declaration.
   *
   * **NOTE**: This is only intended to be used internally.
   */
  public static isStore = false;

  /**
   * This static method should be defined within each Store inheriting from the
   * base Store class. This will allow stores to self-initialize their states,
   * without the need to provide state at run-time.
   * Should there be no defaulted state, extended stores _could_
   * be instantiated without an input state, and therefore initialize with some
   * invalid properties.
   */

  public static defaultState(): object {
    throw abstractError;
  }

  /**
   * Create an instance of this store, optionally providing an initial state as
   * either an object, OR, as a callback that returns the state object.
   */

  // NOTE:
  // Whilst the Typescript annotation here serves to define the constructor's
  // own signature type, in actuality, it does nothing.
  constructor(
    // oxlint-disable-next-line no-unused-vars
    initialState?: Partial<State> | (() => Partial<State>),
    // oxlint-disable-next-line no-unused-vars
    applyOnReset?: boolean,
  ) { }

  /**
   * A helper which executes the provided callback, and awaits any side-effects
   * occuring within the callback to also complete before the state is finally
   * committed and broadcast to all listeners. This effectively means that all
   * state changes that are made during a series of actions will applied in a
   * batched process one after the other, then committed to the store at once.
   *
   * **NOTE**: This handler is intended to be used within the scope of a single
   * store and is therefore not exposed when working with a store instance.
   */
  protected action<
    Action extends
    | ((...args: unknown[]) => Promise<void>)
    | ((...args: unknown[]) => void)
    | (() => Promise<void>)
    | (() => void),
  >(
    action: Action,
    onError?: (error: unknown) => void,
    throws?: boolean,
  ): () => void;

  // implementation
  protected action(): () => void {
    throw abstractError;
  }

  /** A helper which returns the current state. */

  // implementation
  protected getState<S extends State>(): S {
    throw abstractError;
  }

  /**
   * A helper which returns a reference to other stores for the purpose of
   * linking state between stores.
   */
  protected get linked(): LinkedStores {
    throw abstractError;
  };

  /**
   * A helper which executes when using a `<StoreProvider />` component is
   * mounted into the DOM. These providers will be exported by packages that
   * are associated with `@cimanyd/stores`.
   */
  protected async onMount(): Promise<void> {
    throw abstractError;
  }

  /**
   * A helper which allows mutative transformations to state that are handled
   * within the context of a "draft" callback. No return is expected by this
   * callback, and all transformations made to the draft are applied once the
   * callback has completed its execution.
   */

  // annotation
  public produce<S extends State>(draft: (state: S) => void): typeof this;

  public produce<S extends State>(
    draft: (state: Draft<S>) => void,
  ): typeof this;

  // implementation
  public produce(): typeof this {
    throw abstractError;
  }

  /**
   * A helper to reset this store to a default state. This method accepts a
   * callback, `reInitialize`, as an argument to intercept the new default
   * state, (as well as the last active state), to return a somewhat merged
   * version of the state for initial conditions. This is relevant where it
   * makes sense to preserve some UI state that is irrelevant to changes in
   * contextually bound data.
   *
   * **NOTE**: This handler is intended to be used within the scope of the
   * store itself and is therefore not exposed. It is recommended that another
   * reset function, for example `initialize`, be defined, and used. This is
   * mainly to avoid confusion when handling complex reset logic.
   */

  // annotation
  protected reset<S extends State>(
    reInitialize?: (nextState: S, lastState: Readonly<S>) => void,
  ): typeof this;

  protected reset<S extends State>(
    reInitialize?: (nextState: Draft<S>, lastState: Readonly<S>) => void,
  ): typeof this;

  // implementation
  protected reset(): typeof this {
    throw abstractError;
  }

  /**
   * A state dispatching function which accepts either a new state object, OR,
   * a state transformation callback that uses previous state to determine the
   * new next state. If the second argument is `true`, this Store will replace
   * the old state with the incoming state. Otherwise the store will perform a
   * partial merge of the incoming state over the existing state.
   */

  // annotation
  public setState<S extends State>(
    nextState: S | ((currentState: Readonly<S>) => S),
    overwrite: true,
  ): typeof this;

  // annotation
  public setState<S extends State>(
    nextState: Partial<S> | ((currentState: Readonly<S>) => Partial<S>),
    overwrite?: false,
  ): typeof this;

  // implementation
  public setState(): typeof this {
    throw abstractError;
  }

  /** The current state value returned by this store. */
  public get state(): State & object {
    throw abstractError;
  }
}

export interface StoreConstructor<
  StoreType extends Store<State>,
  State extends object,
> {
  new <S extends State>(
    initialState?: Partial<S> | (() => Partial<S>),
    applyOnReset?: boolean,
  ): StoreType & { state: S };
  defaultState<S extends State>(): S;
  isStore: boolean;
}
