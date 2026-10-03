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
 *
 * If the app outgrows it, React Navigation also works on Harmony via the
 * @react-native-ohos ports of react-native-screens / safe-area-context /
 * gesture-handler; only this file and the screen registry need to change.
 */

type NavigationApi<Route extends string> = {
  route: Route;
  canGoBack: boolean;
  navigate: (route: Route) => void;
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
  const [stack, setStack] = useState<Route[]>([initialRoute]);
  const canGoBack = stack.length > 1;

  const navigate = useCallback(
    (route: Route) => setStack(s => [...s, route]),
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

  const route = stack[stack.length - 1];
  const api = useMemo<NavigationApi<Route>>(
    () => ({ route, canGoBack, navigate, goBack }),
    [route, canGoBack, navigate, goBack],
  );
  const ScreenComponent: ComponentType = screens[route];

  return (
    <NavigationContext.Provider value={api as unknown as NavigationApi<string>}>
      <ScreenComponent />
    </NavigationContext.Provider>
  );
}
