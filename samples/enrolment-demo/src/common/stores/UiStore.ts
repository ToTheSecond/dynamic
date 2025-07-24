import { computed, Store } from './$';

export interface UiStoreState {
  count: number;
  darkMode: boolean;
}

export class UiStore<State extends UiStoreState = UiStoreState> extends Store<State> {
  public static override defaultState(): UiStoreState {
    return {
      count: 1,
      darkMode: false,
    };
  }

  public increment(): void {
    this.produce((draft) => draft.count++);
  }

  public toggleDarkMode(): void {
    this.produce((draft) => (draft.darkMode = !draft.darkMode));
  }

  public doBoth1 = this.action(() => {
    this.increment();
    this.toggleDarkMode();
  })

  public doBoth2 = this.action(() => {
    this.increment();
    this.increment();
    this.toggleDarkMode();
  })

  @computed(['count'])
  public get isMultipleOf4() {
    return this.state.count % 4 === 0;
  }
}


export interface AdvUiStoreState extends UiStoreState {
  bonusFeature: 'yay' | 'nay'
}


export class AdvancedUiStore extends UiStore<AdvUiStoreState> {
  public static override defaultState(): AdvUiStoreState {
    return {
      count: 1,
      darkMode: false,
      bonusFeature: 'yay'
    };
  }

  public unlockBonus() {
    this.toggleDarkMode();
  }

  @computed(['count'])
  public get someValue() {
    return this.state.count > 4;
  }
}
