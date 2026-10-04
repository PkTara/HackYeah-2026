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
 * Android, iOS and web. The system back gesture/button pops the stack.
 * Tabs call `reset` so each tab starts a fresh stack.
 *
 * If the app outgrows it, React Navigation works on Android, iOS and web;
 * only this file and the screen registry need to change.
 */

type Params = Readonly<Record<string, string>>;
export type NavigationEntry<Route extends string> = Readonly<{
  route: Route;
  params: Params;
}>;
type Entry<Route extends string> = NavigationEntry<Route>;

/** One level of a breadcrumb trail: a screen and the params that pick it. */
export type TrailStep<Route extends string> = Readonly<{
  route: Route;
  params?: Params;
}>;

/** True when the entry is that screen, with at least those params. */
function isStep<Route extends string>(
  entry: Entry<Route>,
  step: TrailStep<Route>,
): boolean {
  return (
    entry.route === step.route &&
    Object.entries(step.params ?? {}).every(([k, v]) => entry.params[k] === v)
  );
}

/**
 * The stack after going back to the last step of `trail`: popped to that
 * screen when the stack has it, otherwise the trail itself (after a web
 * link straight to a pushed screen, for example).
 */
export function stackBackTo<Route extends string>(
  stack: readonly Entry<Route>[],
  trail: readonly TrailStep<Route>[],
): Entry<Route>[] {
  const target = trail[trail.length - 1];
  if (!target) {
    return [...stack];
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    if (isStep(stack[i], target)) {
      return stack.slice(0, i + 1);
    }
  }
  return trail.map(step => ({ route: step.route, params: step.params ?? {} }));
}

type NavigationApi<Route extends string> = {
  route: Route;
  /** The first screen of the stack, i.e. the active tab. */
  root: Route;
  params: Params;
  canGoBack: boolean;
  navigate: (route: Route, params?: Params) => void;
  reset: (route: Route) => void;
  goBack: () => void;
  /** Goes back to the last step of a breadcrumb trail; see stackBackTo. */
  backTo: (trail: readonly TrailStep<Route>[]) => void;
  /**
   * Starts a fresh stack along a trail, like `reset` for a page inside a
   * tab: opening Log > Log a climb from the Profile tab shows the Log tab,
   * and going back lands on the Log list.
   */
  openTrail: (trail: readonly TrailStep<Route>[]) => void;
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
  /** Restore the in-memory stack after changing the active dataset. */
  initialStack?: readonly NavigationEntry<Route>[];
  onStackChange?: (stack: readonly NavigationEntry<Route>[]) => void;
};

export function Navigator<Route extends string>({
  initialRoute,
  screens,
  initialStack,
  onStackChange,
}: Props<Route>) {
  const [stack, setStack] = useState<Entry<Route>[]>(() =>
    initialStack?.length
      ? [...initialStack]
      : [{ route: initialRoute, params: {} }],
  );
  useEffect(() => onStackChange?.(stack), [stack, onStackChange]);
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
  const backTo = useCallback(
    (trail: readonly TrailStep<Route>[]) =>
      setStack(s => stackBackTo(s, trail)),
    [],
  );
  const openTrail = useCallback(
    (trail: readonly TrailStep<Route>[]) =>
      setStack(s =>
        trail.length
          ? trail.map(step => ({
              route: step.route,
              params: step.params ?? {},
            }))
          : s,
      ),
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
      backTo,
      openTrail,
    }),
    [top, root, canGoBack, navigate, reset, goBack, backTo, openTrail],
  );
  const ScreenComponent: ComponentType = screens[top.route];

  return (
    <NavigationContext.Provider value={api as unknown as NavigationApi<string>}>
      <ScreenComponent />
    </NavigationContext.Provider>
  );
}
