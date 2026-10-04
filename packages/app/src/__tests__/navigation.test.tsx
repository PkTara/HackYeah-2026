import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Navigator, stackBackTo, useNavigation } from '../navigation/Navigator';
import { trailFor } from '../navigation/trail';

type Route = 'Hands' | 'Finger' | 'Anatomy' | 'Profile';
const entry = (route: Route, params: Record<string, string> = {}) => ({
  route,
  params,
});

describe('stackBackTo', () => {
  const ring = { side: 'right', finger: 'ring' };

  it('pops the stack to the screen when it is open below', () => {
    const stack = [
      entry('Hands'),
      entry('Finger', ring),
      entry('Anatomy', ring),
    ];
    expect(
      stackBackTo<Route>(stack, [
        { route: 'Hands' },
        { route: 'Finger', params: ring },
      ]),
    ).toEqual([entry('Hands'), entry('Finger', ring)]);
    expect(stackBackTo<Route>(stack, [{ route: 'Hands' }])).toEqual([
      entry('Hands'),
    ]);
  });

  it('starts over from the trail when the screen is not in the stack', () => {
    // A web link straight to the anatomy screen.
    const stack = [entry('Anatomy', ring)];
    expect(
      stackBackTo<Route>(stack, [
        { route: 'Hands' },
        { route: 'Finger', params: ring },
      ]),
    ).toEqual([entry('Hands'), entry('Finger', ring)]);
  });

  it('only matches a screen with the same params', () => {
    const stack = [
      entry('Hands'),
      entry('Finger', { side: 'left', finger: 'ring' }),
    ];
    expect(
      stackBackTo<Route>(stack, [
        { route: 'Hands' },
        { route: 'Finger', params: ring },
      ]),
    ).toEqual([entry('Hands'), entry('Finger', ring)]);
  });

  it('keeps the stack for an empty trail', () => {
    const stack = [entry('Profile')];
    expect(stackBackTo<Route>(stack, [])).toEqual(stack);
  });
});

describe('Navigator.backTo', () => {
  it('goes back through the screens of the trail', () => {
    let api!: ReturnType<typeof useNavigation<Route>>;
    function Probe() {
      api = useNavigation<Route>();
      return <Text>{api.route}</Text>;
    }
    const screens = {
      Hands: Probe,
      Finger: Probe,
      Anatomy: Probe,
      Profile: Probe,
    };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <Navigator<Route> initialRoute="Hands" screens={screens} />,
      );
    });
    act(() => api.navigate('Finger', { side: 'right', finger: 'ring' }));
    act(() => api.navigate('Anatomy', { side: 'right', finger: 'ring' }));
    expect(api.route).toBe('Anatomy');

    act(() =>
      api.backTo([
        { route: 'Hands' },
        { route: 'Finger', params: { side: 'right', finger: 'ring' } },
      ]),
    );
    expect(api.route).toBe('Finger');
    expect(api.canGoBack).toBe(true);

    act(() => api.backTo([{ route: 'Hands' }]));
    expect(api.route).toBe('Hands');
    expect(api.canGoBack).toBe(false);
    act(() => renderer.unmount());
  });
});

describe('trailFor', () => {
  const labels = (route: Parameters<typeof trailFor>[0], params = {}) =>
    trailFor(route, params).map(c => c.label);

  it('puts the finger close-up under Hands, even without params', () => {
    expect(labels('Finger', { side: 'right', finger: 'ring' })).toEqual([
      'Hands',
      'Right ring finger',
    ]);
    expect(labels('Finger')).toEqual(['Hands', 'Right index finger']);
  });

  it('puts the anatomy screen under its finger, or under Hands', () => {
    expect(labels('Anatomy', { side: 'left', finger: 'thumb' })).toEqual([
      'Hands',
      'Left thumb',
      'Anatomy',
    ]);
    expect(labels('Anatomy')).toEqual(['Hands', 'Hand anatomy']);
  });

  it('puts the other pushed screens under the tab that opens them', () => {
    expect(labels('Evidence', { terrain: 'slab' })).toEqual([
      'Profile',
      'Evidence',
    ]);
    expect(labels('About')).toEqual(['Data', 'About']);
    expect(labels('Test', { id: 'dead-hang' })).toEqual(['Data', 'Dead hang']);
  });

  it('places utilities, live measurements and finger force under canonical Data breadcrumbs', () => {
    expect(labels('Settings')).toEqual(['Data', 'Settings']);
    expect(labels('FingerStrength')).toEqual(['Data', 'Finger strength']);
    expect(labels('Assessment')).toEqual(['Data', 'Leg spread']);
    expect(labels('Assessment', { metric: 'shoulder_reach' })).toEqual([
      'Data',
      'Shoulder reach',
    ]);
    expect(
      labels('Settings', { from: 'Assessment', metric: 'shoulder_reach' }),
    ).toEqual(['Data', 'Shoulder reach', 'Settings']);
    expect(
      trailFor('Settings', { from: 'Assessment', metric: 'shoulder_reach' })[1],
    ).toMatchObject({
      route: 'Assessment',
      params: { metric: 'shoulder_reach' },
    });
    expect(labels('About', { from: 'Settings' })).toEqual([
      'Data',
      'Settings',
      'About',
    ]);
  });

  it('has no trail on visible tabs and canonicalizes the Tests alias', () => {
    expect(labels('Hands')).toEqual([]);
    expect(labels('Profile')).toEqual([]);
    expect(labels('Data')).toEqual([]);
    expect(labels('Tests')).toEqual(['Data']);
  });

  it('keeps the hand-capture context in the full About trail through Settings', () => {
    const trail = trailFor('About', {
      from: 'Settings',
      settingsFrom: 'HandCapture',
      side: 'left',
      finger: 'ring',
    });
    expect(trail.map(step => step.label)).toEqual([
      'Hands',
      'Left ring finger',
      'Add a photo',
      'Settings',
      'About',
    ]);
    expect(trail[3]).toMatchObject({
      route: 'Settings',
      params: { from: 'HandCapture', side: 'left', finger: 'ring' },
    });
    expect(trail[1].params).toEqual({ side: 'left', finger: 'ring' });
  });

  it('keeps the params that pick the finger in its crumb', () => {
    const [, finger] = trailFor('Anatomy', {
      side: 'left',
      finger: 'ring',
      spot: 'a2',
    });
    expect(finger.params).toEqual({ side: 'left', finger: 'ring' });
    expect(finger.short).toBe('Left ring');
  });
});
