/**
 * Where the camera screens start from: the Data tab (camera assessment)
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

describe('Data tab', () => {
  it('opens leg spread from the supported Tests alias under Data', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'Tests');
    expect(control(screen, 'Open leg spread')).toBeDefined();
    expect(text(screen)).not.toContain(NEEDS_SERVER);
    await press(screen, 'Open leg spread');
    await press(screen, 'Leg spread assessment');
    expect(has(screen, 'Back to Data')).toBe(true);
    expect(has(screen, 'Leg spread')).toBe(true);
    expect(control(screen, 'Record')).toBeDefined();
    expect(fixture.preview.active).toBe(false);
    await press(screen, 'Back to Data');
    expect(control(screen, 'Open leg spread')).toBeDefined();
    await act(async () => screen.unmount());
  });

  it('opens shoulder reach with its selected metric and Data breadcrumb', async () => {
    const fixture = setup();
    const screen = await render(fixture, 'Data');
    await press(screen, 'Open shoulder reach');
    await press(screen, 'Shoulder reach assessment');
    expect(has(screen, 'Back to Data')).toBe(true);
    expect(has(screen, 'Shoulder reach')).toBe(true);
    expect(text(screen)).toContain('Begin with arms resting at your sides');
    expect(control(screen, 'Record')).toBeDefined();
    expect(fixture.preview.active).toBe(false);
    await press(screen, 'Back to Data');
    expect(control(screen, 'Open shoulder reach')).toBeDefined();
    await act(async () => screen.unmount());
  });

  it('keeps the camera placeholder when opening a measurement without a server', async () => {
    const fixture = setup({ media: false });
    const screen = await render(fixture, 'Tests');
    await press(screen, 'Open leg spread', 'Leg spread assessment');
    expect(text(screen)).toContain('Connect the analysis service');
    expect(text(screen)).toContain('Camera off');
    expect(control(screen, 'Record').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(control(screen, 'Leg spread assessment')).toBeUndefined();
    await act(async () => screen.unmount());
  });

  it('a link straight to the assessment without a server retains a camera placeholder and disables Record', async () => {
    const fixture = setup({ media: false });
    const screen = await render(fixture, 'Assessment');
    expect(text(screen)).toContain('Connect the analysis service');
    expect(text(screen)).toContain('Camera off');
    expect(control(screen, 'Record').props.accessibilityState.disabled).toBe(
      true,
    );
    await press(screen, 'Record');
    expect(fixture.preview.active).toBe(false);
    expect(fixture.requests).toEqual([]);
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
