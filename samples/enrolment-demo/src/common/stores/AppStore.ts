import { Store, } from './$'

interface AppStoreState {
  isAuthenticated: boolean;
  currentRole: string | null;
  currentUser: string | null;
}

export class AppStore extends Store<AppStoreState> {
  public static defaultState() {
    return {
      isAuthenticated: false,
      currentRole: null,
      currentUser: null,
    }
  }

  public addRole(role: string): void {
    this.setState({ currentRole: role });
  }

  public removeRole(): void {
    this.setState({ currentRole: null });
  }
}

// const appStore = new AppStore();
// useAppStore(({ state: { currentRole, currentUser}, setState }, { runInAction }) => ({
//   someProp: `${currentUser} is ${currentRole}`,
//   myCallback: runInAction(() => {
//     setState({
//     })
//   }),
// }));