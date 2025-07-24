import { Store } from './Base';

export type ActionType =
  | ((...args: any[]) => Promise<void>)
  | ((...args: any[]) => void)
  | (() => Promise<void>)
  | (() => void);

export type ComputedGet<Type extends StoreInstance> =
  // Runtime Evaluation Type
  ((propertyKey: Type, propertyDescriptor: PropertyDescriptor) => void) &
    (<Result>(
      // Class Decorator Type
      property: Type,
      propertyDescriptor: ClassGetterDecoratorContext<Type, Result>,
    ) => void) &
    (<Result>(
      // Class Decorator Type
      property: Type,
      propertyKey: Extract<keyof Type, string>,
      propertyDescriptor: TypedPropertyDescriptor<Result>,
    ) => void);

export type RunInAction = <Action extends ActionType>(
  action: Action,
  onError?: ((error: unknown) => void) | undefined,
  throws?: boolean,
) => (...args: Parameters<Action>) => void;

export type Subscribe<Source> = (
  listener: (source: Source) => void,
) => () => void;

/** The Typescript definition of a Store class declaration. */
export type StoreClass<State extends object = any> = typeof Store<State>;

/** The Typescript definition of an instatianted Store. */
export type StoreInstance<State extends object = any> = Store<State>;

/** A look-up object of Store instance types. */
export type StoresType = Record<string, StoreInstance>;

/** A utility for extracting the state type for a given store. */
export type StateOf<Type extends StoreInstance<any>> = Extract<
  Type,
  { state: object }
>['state'];

/**
 * A simple representation of a `StoresType` converted to an array of entries
 * as per the `Object.entries` function.
 */
export type StoreEntries<Stores extends StoresType> = Array<
  {
    [Key in keyof Stores]: [Key, Stores[Key]];
  }[keyof Stores]
>;
