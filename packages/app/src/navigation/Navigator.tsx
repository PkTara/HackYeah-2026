import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Minimal stack navigator with no native dependencies, so it runs unchanged on
 * Harmony, Android, iOS and web. The system back gesture/button pops the stack.
 * Tabs call `reset` so each tab starts a fresh stack.
 *
 * If the app outgrows it, React Navigation also works on Harmony via the
 * @react-native-ohos ports of react-native-screens / safe-area-context /
 * gesture-handler; only this file and the screen registry need to change.
 */

type Params = Readonly<Record<string, string>>;
type Entry<Route extends string> = Readonly<{ route: Route; params: Params }>;

type NavigationApi<Route extends string> = {
  route: Route;
  /** The first screen of the stack, i.e. the active tab. */
  root: Route;
  params: Params;
  canGoBack: boolean;
  navigate: (route: Route, params?: Params) => void;
  reset: (route: Route) => void;
  goBack: () => void;
};

const NavigationContext = createContext<NavigationApi<string> | null>(null);

export function useNavigation<Route extends string>(): NavigationApi<Route> {
  const api = useContext(NavigationContext);
  if (!api) {
    throw new Error('useNavigation must be used inside <Navigator>');
  }
  return api as unknown as NavigationApi<Route>;
}

type Props<Route extends string> = {
  initialRoute: Route;
  screens: Record<Route, ComponentType>;
};

export function Navigator<Route extends string>({
  initialRoute,
  screens,
}: Props<Route>) {
  const [stack, setStack] = useState<Entry<Route>[]>([
    { route: initialRoute, params: {} },
  ]);
  const canGoBack = stack.length > 1;

  const navigate = useCallback(
    (route: Route, params: Params = {}) =>
      setStack(s => [...s, { route, params }]),
    [],
  );
  const reset = useCallback(
    (route: Route) => setStack([{ route, params: {} }]),
    [],
  );
  const goBack = useCallback(
    () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)),
    [],
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      return; // no hardware back button; react-native-web only stubs BackHandler
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!canGoBack) {
          return false; // let the OS handle it (leave the app)
        }
        goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [canGoBack, goBack]);

  const top = stack[stack.length - 1];
  const root = stack[0].route;
  const api = useMemo<NavigationApi<Route>>(
    () => ({
      route: top.route,
      root,
      params: top.params,
      canGoBack,
      navigate,
      reset,
      goBack,
    }),
    [top, root, canGoBack, navigate, reset, goBack],
  );
  const ScreenComponent: ComponentType = screens[top.route];

  return (
    <NavigationContext.Provider value={api as unknown as NavigationApi<string>}>
      <ScreenComponent />
    </NavigationContext.Provider>
  );
}
