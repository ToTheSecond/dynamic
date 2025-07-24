const enum Bank {
  EVENT_LISTENERS,
  KEYS,
  LOCKS,
  VAULTS,
  WARNING,
}

interface IBank<
  Id extends string | number,
  Key extends number,
  Lock extends number,
> {
  [Bank.EVENT_LISTENERS]: Record<Id, Array<() => void>>;
  [Bank.KEYS]: Record<Id, Key>;
  [Bank.LOCKS]: Record<Lock, number>;
  [Bank.VAULTS]: Record<Key, Set<Lock>>;
  [Bank.WARNING]: boolean;
}

const maximumVaultsMessage =
  'Bank: A total of 32 vaults are supported for a given system.';

const errorOn33Vaults = `${maximumVaultsMessage} Cannot create another vault!`;

const warnOn24Vaults = `${maximumVaultsMessage} This is only a warning and may be ignored.`;

const warnOn32Vaults = `${maximumVaultsMessage} This is the 31st vault...`;

const warning =
  'Bank: no ids provided. Defaulting to action handler without a lock.';

function noOp(): void {
  /** No-op */
}

function onTrue(): boolean {
  return true;
}

function create<
  Id extends string | number,
  Key extends number = number,
  Lock extends number = number,
>(
  onComplete: (ids: Id[] | [Lock, ...Id[]]) => void = noOp,
  withDebugging?: boolean,
) {
  type BankType = IBank<Id, Key, Lock>;

  const bank = [{}, {}, {}, {}, true] as object as BankType;
  const zero = 0 as Lock;

  async function actionHandler(
    onAction: (() => void) | (() => Promise<void>),
    onAfter: () => boolean,
    onBefore: () => void,
    onDone: () => void,
    onError: (error: unknown) => void,
    onWarning?: () => void,
  ) {
    if (onWarning) onWarning();

    try {
      // Acquire a lock for this action.
      onBefore();
      // Execute the action(s).
      await onAction();
    } catch (error) {
      // Handle any errors.
      if (onError) onError(error);
    } finally {
      // Release the action from the lock and conclude the flow.
      onAfter() && onDone();
    }
  }

  function afterDecrement(lock: Lock, key: Key): void {
    if ((lock & key) === key) bank[Bank.VAULTS][key].delete(lock);
  }

  function afterIncrement(lock: Lock, key: Key): void {
    if ((lock & key) === key) bank[Bank.VAULTS][key].add(lock);
  }

  function assign(id: Id): Key {
    const { length } = Object.keys(bank[Bank.KEYS]);

    // Validate the number of vaults.
    if (length >= 32) throw new Error(errorOn33Vaults);
    else if (length === 31) console.warn(warnOn32Vaults);
    else if (length === 24 && bank[Bank.WARNING]) console.warn(warnOn24Vaults);

    // Create a new key based on the number of existing keys.
    const key = (bank[Bank.KEYS][id] = (2 ** length) as Key);

    // Create a vault for the new key.
    bank[Bank.VAULTS][key] = new Set();

    // Set and return the key associated with the ID.
    return key;
  }

  function getKey(id: Id, auto: 0 | 1 = 1): Key {
    return bank[Bank.KEYS][id] ?? (auto && assign(id));
  }

  function getLock(next: Lock, id: Id): Lock {
    return (next + getKey(id)) as Lock;
  }

  function getVault(ids: Id[]): Lock {
    return ids.reduce(getLock, zero);
  }

  function handleCatch(
    onError?: ((error: unknown) => void) | null,
    throws?: boolean,
    error?: unknown,
  ) {
    // Handle any errors.
    if (onError) onError(error);
    if (throws) throw error;
  }

  function handleDecrement(lock: Lock): boolean {
    // For multiple locks, just decrement and return;
    if (--bank[Bank.LOCKS][lock] > 0) return false;

    // Otherwise, for the last lock, delete it.
    delete bank[Bank.LOCKS][lock];

    // Then, remove the lock from all vaults.
    for (const key in bank[Bank.VAULTS])
      afterDecrement(lock, Number(key) as Key);

    return true;
  }

  function handleIncrement(lock: Lock): number | void {
    // For existing locks, just increment and return;
    if (bank[Bank.LOCKS][lock]) return ++bank[Bank.LOCKS][lock];

    // Otherwise, create the first lock and set it to 1.
    bank[Bank.LOCKS][lock] = 1;

    // Add the lock to all matching vaults.
    for (const key in bank[Bank.VAULTS])
      afterIncrement(lock, Number(key) as Key);

    return;
  }

  function handleWarning() {
    if (bank[Bank.WARNING]) console.warn(warning);
  }

  function isLocked(id: Id) {
    return bank[Bank.VAULTS][getKey(id, 0)]?.size > 0;
  }

  function listenerDeregister(id: Id, listener: () => void): void {
    bank[Bank.EVENT_LISTENERS][id] = bank[Bank.EVENT_LISTENERS][id].filter(
      (next) => next !== listener,
    );

    if (!bank[Bank.EVENT_LISTENERS][id].length) {
      delete bank[Bank.EVENT_LISTENERS][id];
    }
  }

  function listenerRegister(
    this: typeof listenerDeregister,
    id: Id,
    listener: () => void,
  ): () => void {
    if (bank[Bank.EVENT_LISTENERS][id]) {
      bank[Bank.EVENT_LISTENERS][id].push(listener);
    } else {
      bank[Bank.EVENT_LISTENERS][id] = [listener];
    }

    return listenerDeregister.bind(this, id, listener);
  }

  function onDoneDefault(ids: Id[], lock: Lock) {
    function onDone() {
      let queue = [] as any[];

      for (const id of ids) if (isLocked(id)) queue.push(id);

      onComplete([lock].concat(queue) as [Lock, ...Id[]]);
    }

    return onDone;
  }

  function register(...ids: Id[]): BankType[Bank.KEYS] {
    for (const id of ids) getKey(id);

    return bank[Bank.KEYS];
  }

  /**
   * Given the provided ID(s), creates a callback for which all executions that
   * are passed in will be awaited before the provided `onDone` function will
   * be called. The intention is that the `onDone` callback is itself the same
   * for all calls to the `actionHandler`.
   *
   * **Note**:
   * Should no ID(s) be provided to this function, the action will be executed
   * immediately, followed by the `onDone` function. This will log a warning to
   * the console to ensure visibility to the issue.
   */
  function runActionsViaLock(...ids: Id[]) {
    if (!ids.length)
      return function unboundAction(
        this: any,
        action: ((lock: Lock) => void) | ((lock: Lock) => Promise<void>),
        onDone: (lock: Lock) => void = noOp,
        onError?: ((error: unknown) => void) | null,
        throws?: boolean,
      ) {
        return actionHandler(
          action.bind(this, zero),
          onTrue,
          noOp,
          onDone.bind(this, zero),
          handleCatch.bind(this, onError, throws),
          handleWarning,
        );
      };

    // Get a lock, which is an aggregate of all matching keys.
    const lock = getVault(ids);

    // Return the function to to run the action in for this lock.
    return function boundAction(
      this: any,
      action: ((lock: Lock) => void) | ((lock: Lock) => Promise<void>),
      onDone: (lock: Lock) => void = onDoneDefault(ids, lock),
      onError?: ((error: unknown) => void) | null,
      throws?: boolean,
    ) {
      return actionHandler(
        action.bind(this, lock),
        handleDecrement.bind(this, lock),
        handleIncrement.bind(this, lock),
        onDone.bind(this, lock),
        handleCatch.bind(this, onError, throws),
      );
    };
  }

  return withDebugging
    ? ([isLocked, listenerRegister, register, runActionsViaLock, bank] as const)
    : ([isLocked, listenerRegister, register, runActionsViaLock] as const);
}

export default create;
