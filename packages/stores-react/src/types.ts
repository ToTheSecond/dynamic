import type {
  AreStatesEqualSettings,
  RunInAction,
  StoreInstance,
  StoresType,
} from '@cimanyd/stores';
import type { ToInstanceName } from './utils';

export type AccessTo<Source> = [() => Source, Subscribe<Source>, RunInAction];

export type AnySelectFunction<
  Source,
  Helpers extends object,
  Select = any,
  Options extends object | undefined = undefined,
> = Options extends object
  ? (source: Source, options: Options, helpers: Helpers) => Select
  : (source: Source, helpers: Helpers) => Select;

export type ConnectionState<
  Source,
  Select extends AnySelectFunction<Source, Helpers>,
  Helpers extends object = {},
> = [
    /** Dismisses the current connection, stopping all future updates. */
    disconnect: () => void,
    /**
     * Updates the select method's reference, such that updates always use the
     * most correct state.
     */
    maintain: (select: Select, options?: Partial<AreStatesEqualSettings>) => void,
    /** The current cached value. */
    value: ReturnType<Select>,
  ];

export type ContextState<Source> = [
  /** Dismisses the current connection, stopping all future updates. */
  disconnect: () => void,
  /**
   * Updates the select method's reference, such that updates always use the
   * most correct state.
   */
  maintain: (options?: Partial<AreStatesEqualSettings>) => void,
  /** The current cached value. */
  value: Source,
];

export type HookSettings = Partial<AreStatesEqualSettings> | undefined;

export type Safe<Source> =
  | [source: (Source & StoreInstance) | undefined, isRecord: false]
  | [source: (Source & StoresType) | undefined, isRecord: true];

export type SelectFrom<
  Source extends SelectSource,
  Selection,
  Options extends object | undefined = undefined,
> = AnySelectFunction<Source, SelectHelpers, Selection, Options>;

export type SelectHelpers = { runInAction: RunInAction };

export type SelectSource = StoreInstance | StoresType;

export type SelectTarget =
  | StoreInstance
  | StoresType
  | UseStore<StoreInstance>
  | UseStores<StoresType>;

export type SourceFor<Target extends SelectTarget> =
  Target extends UseStore<infer Store>
  ? Store
  : Target extends UseStores<infer Stores>
  ? Stores
  : Target extends StoreInstance | StoresType
  ? Target
  : never;

export type StoreEntries<Stores extends StoresType> = Array<
  {
    [Key in keyof Stores]: [Key, Stores[Key]];
  }[keyof Stores]
>;

export interface StoreMiddleware<StoreKey extends string> {
  interStoreBindings?: Partial<{ [Key in StoreKey]: Array<ToInstanceName<StoreKey>> }>;
  hookSettings?: HookSettings;
}

export type Subscribe<Source> = (
  listener: (source: Source) => void,
) => () => void;

export type SelectFunction<
  Source extends SelectSource,
  Props extends object | undefined = undefined,
> = <Selection>(
  select: SelectFrom<Source, Selection, Props>,
  options?: Partial<AreStatesEqualSettings>,
) => Selection;

export type UseContext<Source extends StoresType> = () => Source;

export type UseSelector<
  Target extends SelectSource,
  Props,
  Selection,
  Selector extends SelectFrom<Target, Selection>,
> = (...args: Props extends object ? [props: Props] : []) => Selector;

export type UseStore<Store extends StoreInstance> = SelectFunction<Store>;

export type UseStores<Stores extends StoresType> = SelectFunction<Stores>;
