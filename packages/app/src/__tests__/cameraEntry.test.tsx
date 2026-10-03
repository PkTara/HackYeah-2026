/**
 * Where the camera screens start from: the Tests tab (camera assessment)
 * and the Hands tab and finger close-up (hand photos). Without a server,
 * the on-device demo says so and offers nothing that would fake a result.
 */
import { act } from 'react-test-renderer';
import {
  control,
  has,
  press,
  render,
  setup,
  text,
} from '../testing/cameraFixture';

const NEEDS_SERVER = 'needs the Climbing Monkey server';

describe('Tests tab', () => {
  it('opens the camera assessment under Tests', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'Tests');
    expect(text(screen)).toContain('not a validated flexibility test');
    expect(text(screen)).not.toContain(NEEDS_SERVER);
    await press(screen, 'Camera assessment');
    expect(has(screen, 'Back to Tests')).toBe(true);
    expect(has(screen, 'Leg spread')).toBe(true);
    expect(control(screen, 'Start camera')).toBeDefined();
    expect(fixture.preview.active).toBe(false);
    await press(screen, 'Back to Tests');
    expect(control(screen, 'Camera assessment')).toBeDefined();
    await act(async () => screen.unmount());
  });

  it('says it needs the server in the on-device demo', async () => {
    const fixture = setup({ media: false });
    const screen = await render(fixture, 'Tests');
    expect(text(screen)).toContain('This needs the Climbing Monkey server');
    expect(text(screen)).toContain('npm run backend:start');
    expect(control(screen, 'Camera assessment')).toBeUndefined();
    await act(async () => screen.unmount());
  });

  it('a link straight to the camera screen without a server shows no camera', async () => {
    const fixture = setup({ media: false });
    const screen = await render(fixture, 'Assessment');
    expect(text(screen)).toContain(`The camera assessment ${NEEDS_SERVER}`);
    expect(control(screen, 'Start camera')).toBeUndefined();
    await act(async () => screen.unmount());
  });
});

describe('Hands tab', () => {
  it('opens a hand photo under Hands', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'Hands');
    await press(screen, 'Add a photo');
    expect(has(screen, 'Back to Hands')).toBe(true);
    expect(has(screen, 'Hand photo')).toBe(true);
    expect(control(screen, 'Start camera')).toBeDefined();
    await act(async () => screen.unmount());
  });

  it('opens a hand photo from a finger close-up, under that finger', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'Hands');
    await press(screen, 'Right ring finger');
    await press(screen, 'Add a photo of your right ring finger');
    expect(has(screen, 'Back to Right ring finger')).toBe(true);
    await press(screen, 'Start camera', 'Take photo');
    expect(
      screen.root.findAll(
        n =>
          n.props.accessibilityLabel === 'Ring finger' &&
          n.props['aria-selected'],
      ).length,
    ).toBeGreaterThan(0);
    await act(async () => screen.unmount());
  });

  it('says it needs the server in the on-device demo', async () => {
    const fixture = setup({ media: false });
    const screen = await render(fixture, 'Hands');
    expect(text(screen)).toContain('This needs the Climbing Monkey server');
    expect(control(screen, 'Add a photo')).toBeUndefined();
    await press(screen, 'Right ring finger');
    expect(
      control(screen, 'Add a photo of your right ring finger'),
    ).toBeUndefined();
    await act(async () => screen.unmount());
  });
});
