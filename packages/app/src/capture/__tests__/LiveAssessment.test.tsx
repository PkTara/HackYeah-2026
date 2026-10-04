import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, StyleSheet, View } from 'react-native';
import { capabilities, type CameraPreviewProps } from '@hackyeah/platform';
import type { LiveHandlers, MediaClient } from '@hackyeah/data';
import { LiveAssessment } from '../LiveAssessment';
import { CapabilitiesContext } from '../../capabilities';
import type { AssessmentRecord } from '@hackyeah/core';
import { Panel } from '@hackyeah/ui';
import { shoulder } from '../../testing/livePoseFixture';
import { text } from '../../testing/cameraFixture';
function fixture(cameraReady = true) {
  const camera = { snapshot: jest.fn() };
  const stop = jest.fn();
  const save = jest.fn(async (_records: readonly AssessmentRecord[]) => {});
  let handlers: LiveHandlers;
  const preview = { active: false };
  let ready!: () => void;
  const media = {
    server: 'http://server.test',
    startLive: jest.fn(async (_camera, _consent, value) => {
      handlers = value;
      return { stop };
    }),
  } as unknown as MediaClient;
  function Preview({ active, onReady, onGeometry }: CameraPreviewProps) {
    preview.active = active;
    useEffect(() => {
      if (active) {
        onGeometry?.({
          imageWidth: 640,
          imageHeight: 480,
          mirrored: false,
          fit: 'contain',
        });
        ready = () => onReady(camera);
        if (cameraReady) {
          ready();
        }
      }
      return () => onReady(null);
    }, [active, onReady, onGeometry]);
    return <View />;
  }
  let screen: ReactTestRenderer;
  const props = {
    media,
    consent: true,
    metric: 'shoulder_reach' as const,
    simulated: false,
    onSettings: jest.fn(),
    onSave: save,
    onCompletionChange: jest.fn(),
  };
  const render = (consent = true) => (
    <CapabilitiesContext.Provider
      value={{ ...capabilities, camera: { Preview, MediaPreview: () => null } }}
    >
      <LiveAssessment {...props} consent={consent} />
    </CapabilitiesContext.Provider>
  );
  return {
    media,
    stop,
    save,
    preview,
    props,
    async ready() {
      await act(async () => ready());
    },
    get handlers() {
      return handlers;
    },
    get screen() {
      return screen;
    },
    async mount(consent = true) {
      await act(async () => {
        screen = create(render(consent));
      });
    },
    async refresh() {
      await act(async () => screen.update(render()));
    },
    async revoke() {
      await act(async () => screen.update(render(false)));
    },
    async press(label: string) {
      await act(async () => {
        const button = screen.root.findAll(
          node =>
            node.props.accessibilityRole === 'button' &&
            node.props.accessibilityLabel === label,
        )[0];
        button.props.onPress();
      });
    },
    async unmount() {
      await act(async () => screen.unmount());
    },
  };
}
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
test('the Camera tray keeps the same dedicated box before, during and after recording', async () => {
  const f = fixture();
  await f.mount();
  const box = () =>
    f.screen.root.findByProps({ testID: 'assessment-camera-box' });
  expect(StyleSheet.flatten(box().props.style).height).toBe(280);
  expect(JSON.stringify(f.screen.toJSON())).toContain('Camera off');
  await f.press('Record');
  expect(StyleSheet.flatten(box().props.style).height).toBe(280);
  await f.press('Stop');
  expect(StyleSheet.flatten(box().props.style).height).toBe(280);
  expect(JSON.stringify(f.screen.toJSON())).toContain('Camera off');
  await f.unmount();
});
test('the Camera tray holds the box, the live status and Record or Stop, with setup steps beside it', async () => {
  const f = fixture();
  await f.mount();
  const tray = (title: string) =>
    f.screen.root
      .findAllByType(Panel)
      .find(node => node.props.title === title)!;
  expect(tray('Camera')).toBeDefined();
  expect(
    tray('Camera').findAll(
      node => node.props.accessibilityLabel === 'Record',
    ).length,
  ).toBeGreaterThan(0);
  expect(tray('How to measure')).toBeDefined();
  await f.press('Record');
  await act(async () =>
    f.handlers.onResult({
      ...shoulder(0),
      status: 'invalid_capture',
      reason: 'Keep both elbows straight.',
      value: null,
      left_value: null,
      right_value: null,
    }),
  );
  expect(
    tray('Camera').findAll(node => node.props.accessibilityLabel === 'Stop')
      .length,
  ).toBeGreaterThan(0);
  expect(
    tray('Camera').findAll(
      node => node.props.accessibilityLiveRegion === 'polite',
    ).length,
  ).toBeGreaterThan(0);
  expect(
    JSON.stringify(
      tray('Camera').findByProps({ testID: 'assessment-live-status' }).props
        .children,
    ),
  ).toContain('Keep both elbows straight.');
  await f.unmount();
});
test('review keeps the captured reading in the camera box, one Result tray with the actions, and detail breadcrumbs that preserve the result', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => f.handlers.onResult(shoulder(0, 12)));
  await f.press('Stop');
  const titles = () =>
    f.screen.root.findAllByType(Panel).map(node => node.props.title);
  expect(titles()).toEqual(['Camera', 'Result']);
  const result = f.screen.root
    .findAllByType(Panel)
    .find(node => node.props.title === 'Result')!;
  // Quality, the save and retry actions and both detail links share one tray.
  for (const label of [
    'Save result',
    'Retry',
    'Measurement details',
    'Capture details',
  ]) {
    expect(
      result.findAll(node => node.props.accessibilityLabel === label).length,
    ).toBeGreaterThan(0);
  }
  expect(text(f.screen)).toContain('Left 12°');
  expect(text(f.screen)).toContain('confidence');
  // The camera box holds the captured reading instead of an empty preview.
  expect(
    f.screen.root.findAll(
      node =>
        node.props.accessibilityLabel ===
        'Review your result: Left 12° · Right 12°',
    ).length,
  ).toBeGreaterThan(0);
  await f.press('Measurement details');
  expect(titles()).toEqual(['Camera', 'Measurement details']);
  expect(text(f.screen)).toContain('projected angle');
  expect(f.preview.active).toBe(false);
  expect(f.media.startLive).toHaveBeenCalledTimes(1);
  await f.press('Back to Review');
  expect(titles()).toContain('Result');
  expect(text(f.screen)).toContain('Left 12°');
  await f.press('Save result');
  expect(f.save).toHaveBeenCalledTimes(1);
  expect(f.save.mock.calls[0][0][0]).toMatchObject({
    value: 12,
    metric: 'shoulder_reach_left',
  });
  await f.unmount();
});
test('capture details retain demo provenance and a pending save across breadcrumb navigation', async () => {
  const f = fixture();
  f.props.simulated = true;
  let complete!: () => void;
  f.save.mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        complete = resolve;
      }),
  );
  await f.mount();
  await f.press('Record');
  await act(async () => f.handlers.onResult(shoulder(0, 20)));
  await f.press('Stop');
  await f.press('Save result');
  expect(
    f.screen.root.findAll(
      node => node.props.accessibilityLabel === 'Capture details',
    ).length,
  ).toBeGreaterThan(0);
  await f.press('Capture details');
  expect(text(f.screen)).toContain('Simulated on this device');
  expect(text(f.screen)).toContain('front-facing-overhead-reach-v1');
  expect(text(f.screen)).toContain('95%');
  expect(text(f.screen)).not.toContain('http://server.test');
  await f.press('Back to Shoulder reach');
  expect(text(f.screen)).toContain('Simulated on this device');
  await f.press('Back to Review');
  expect(text(f.screen)).toContain('Saving reviewed result');
  await f.press('Retry');
  expect(f.media.startLive).toHaveBeenCalledTimes(1);
  await act(async () => complete());
  expect(text(f.screen)).toContain(
    'Saved simulated result to your demo profile',
  );
  expect(f.save.mock.calls[0][0][0]).toMatchObject({
    value: 20,
    simulated: true,
  });
  await f.unmount();
});
test('the shared completion control follows local review stages and cannot discard a pending save', async () => {
  const f = fixture();
  await f.mount();
  const completion = () => f.props.onCompletionChange.mock.calls.at(-1)?.[0];
  expect(f.props.onCompletionChange).toHaveBeenLastCalledWith(undefined);
  await f.press('Record');
  await act(async () => f.handlers.onResult(shoulder(0, 20)));
  await f.press('Stop');
  expect(completion()).toMatchObject({
    disabled: false,
    onPress: expect.any(Function),
  });
  await f.press('Measurement details');
  await act(async () => completion().onPress());
  expect(text(f.screen)).toContain('Review your result');
  let complete!: () => void;
  f.save.mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        complete = resolve;
      }),
  );
  await f.press('Save result');
  expect(completion().disabled).toBe(true);
  await act(async () => completion().onPress());
  expect(text(f.screen)).toContain('Saving reviewed result');
  await act(async () => complete());
  expect(completion().disabled).toBe(false);
  await act(async () => completion().onPress());
  expect(f.props.onCompletionChange).toHaveBeenLastCalledWith(undefined);
  expect(f.preview.active).toBe(false);
  await f.unmount();
});
test('Record starts camera and the selected live analysis once ready', async () => {
  const f = fixture();
  await f.mount();
  expect(f.preview.active).toBe(false);
  await f.press('Record');
  expect(f.preview.active).toBe(true);
  expect(f.media.startLive).toHaveBeenCalledTimes(1);
  expect(f.media.startLive).toHaveBeenCalledWith(
    expect.anything(),
    true,
    expect.anything(),
    { metric: 'shoulder_reach' },
  );
  await f.unmount();
  expect(f.stop).toHaveBeenCalledTimes(1);
});
test('revoking consent stops live uploads and deactivates the camera', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await f.revoke();
  expect(f.stop).toHaveBeenCalledTimes(1);
  expect(f.preview.active).toBe(false);
  await f.unmount();
});
test('Stop reviews a valid small shoulder movement and saves both sides after review', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => {
    f.handlers.onResult(shoulder(0));
    f.handlers.onResult(shoulder(500, 12));
  });
  await f.press('Stop');
  expect(f.stop).toHaveBeenCalledTimes(1);
  expect(f.preview.active).toBe(false);
  const review = f.screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === 'Save result',
  );
  expect(review.length).toBeGreaterThan(0);
  expect(f.save).not.toHaveBeenCalled();
  await f.press('Save result');
  expect(f.save).toHaveBeenCalledWith([
    expect.objectContaining({
      metric: 'shoulder_reach_left',
      value: 12,
      side: 'left',
      simulated: false,
      protocol: 'front-facing-overhead-reach-v1',
    }),
    expect.objectContaining({
      metric: 'shoulder_reach_right',
      value: 12,
      side: 'right',
      simulated: false,
    }),
  ]);
  await f.unmount();
});
test('steady raised arms auto-stop and can be retried without saving', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => {
    for (const t of [0, 500, 1000]) {
      f.handlers.onResult(shoulder(t));
    }
    for (let t = 1500; t <= 3500; t += 500) {
      f.handlers.onResult(shoulder(t, 170));
    }
  });
  expect(f.stop).toHaveBeenCalledTimes(1);
  expect(f.preview.active).toBe(false);
  expect(f.save).not.toHaveBeenCalled();
  await f.press('Retry');
  expect(f.media.startLive).toHaveBeenCalledTimes(2);
  await f.unmount();
});
test('backgrounding closes camera and upload resources', async () => {
  let background!: (state: string) => void;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    callback: (state: string) => void,
  ) => {
    background = callback;
    return { remove: jest.fn() };
  }) as never);
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => background?.('background'));
  expect(f.stop).toHaveBeenCalledTimes(1);
  expect(f.preview.active).toBe(false);
  await f.unmount();
});
test('becoming inactive closes an established live session and rejects late results', async () => {
  let change!: (state: string) => void;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    callback: (state: string) => void,
  ) => {
    change = callback;
    return { remove: jest.fn() };
  }) as never);
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => change('inactive'));
  expect(f.stop).toHaveBeenCalledTimes(1);
  expect(f.preview.active).toBe(false);
  await act(async () => f.handlers.onResult(shoulder(0)));
  expect(
    f.screen.root.findAll(
      node =>
        typeof node.type === 'string' && node.props.testID === 'live-landmark',
    ),
  ).toHaveLength(0);
  await f.unmount();
});
test('the camera permission inactive transition does not cancel startup before camera readiness', async () => {
  let change!: (state: string) => void;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    callback: (state: string) => void,
  ) => {
    change = callback;
    return { remove: jest.fn() };
  }) as never);
  const f = fixture(false);
  await f.mount();
  await f.press('Record');
  await act(async () => change('inactive'));
  expect(f.preview.active).toBe(true);
  expect(f.media.startLive).not.toHaveBeenCalled();
  await act(async () => change('active'));
  await f.ready();
  expect(f.media.startLive).toHaveBeenCalledTimes(1);
  await f.unmount();
});
test('landmark markings expire when fresh frames stop arriving', async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'clearImmediate'] });
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => {
    f.handlers.onResult(shoulder(0));
  });
  expect(
    f.screen.root.findAll(
      node =>
        typeof node.type === 'string' && node.props.testID === 'live-landmark',
    ).length,
  ).toBeGreaterThan(0);
  await act(async () => jest.advanceTimersByTime(1501));
  expect(
    f.screen.root.findAll(
      node =>
        typeof node.type === 'string' && node.props.testID === 'live-landmark',
    ),
  ).toHaveLength(0);
  await f.press('Stop');
  expect(
    f.screen.root.findAll(
      node => node.props.accessibilityLabel === 'Save result',
    ),
  ).toHaveLength(0);
  await f.unmount();
});
test('a live analysis failure is shown and camera is released', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => f.handlers.onError('Pose runtime is unavailable'));
  expect(JSON.stringify(f.screen.toJSON())).toContain(
    'Pose runtime is unavailable',
  );
  expect(f.preview.active).toBe(false);
  await f.unmount();
});
test('server session end turns off the camera and reviews the last valid reading', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => {
    f.handlers.onResult(shoulder(0));
    f.handlers.onStopped?.();
  });
  expect(f.preview.active).toBe(false);
  expect(
    f.screen.root.findAll(
      node => node.props.accessibilityLabel === 'Save result',
    ).length,
  ).toBeGreaterThan(0);
  await f.unmount();
});
test('failed save is retryable with the same reviewed record identities', async () => {
  const f = fixture();
  f.save.mockRejectedValueOnce(new Error('Offline'));
  await f.mount();
  await f.press('Record');
  await act(async () => {
    f.handlers.onResult(shoulder(0));
  });
  await f.press('Stop');
  await f.press('Save result');
  const first = f.save.mock.calls[0][0];
  await new Promise<void>(resolve => setTimeout(() => resolve(), 5));
  await f.press('Save result');
  expect(f.save.mock.calls[1][0]).toEqual(first);
  await f.unmount();
});
test('valid live landmarks include connected skeleton markings', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => f.handlers.onResult(shoulder(0)));
  expect(
    f.screen.root.findAll(
      node =>
        typeof node.type === 'string' && node.props.testID === 'live-bone',
    ).length,
  ).toBeGreaterThan(0);
  await f.unmount();
});
test('invalid shoulder measurements retain detected markings and correction without becoming reviewable', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => {
    for (let t = 0; t <= 3500; t += 500) {
      f.handlers.onResult({
        ...shoulder(t),
        status: 'invalid_capture',
        value: null,
        left_value: null,
        right_value: null,
        reason: 'Keep both elbows straight with hips and wrists visible.',
      });
    }
  });
  expect(
    f.screen.root.findAll(
      node =>
        typeof node.type === 'string' && node.props.testID === 'live-landmark',
    ).length,
  ).toBeGreaterThan(0);
  expect(JSON.stringify(f.screen.toJSON())).toContain(
    'Keep both elbows straight with hips and wrists visible.',
  );
  expect(f.preview.active).toBe(true);
  expect(f.stop).not.toHaveBeenCalled();
  await f.press('Stop');
  expect(
    f.screen.root.findAll(
      node => node.props.accessibilityLabel === 'Save result',
    ),
  ).toHaveLength(0);
  expect(f.save).not.toHaveBeenCalled();
  await f.unmount();
});
test('missing pose clears previous geometry while its correction remains visible and fresh invalid geometry expires', async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'clearImmediate'] });
  const f = fixture();
  await f.mount();
  await f.press('Record');
  const invalid = {
    ...shoulder(0),
    status: 'invalid_capture' as const,
    value: null,
    left_value: null,
    right_value: null,
    reason: 'Keep both elbows straight.',
  };
  await act(async () => f.handlers.onResult(invalid));
  const marks = () =>
    f.screen.root.findAll(
      node =>
        typeof node.type === 'string' && node.props.testID === 'live-landmark',
    );
  expect(marks().length).toBeGreaterThan(0);
  await act(async () =>
    f.handlers.onResult({
      ...invalid,
      timestamp_ms: 500,
      landmarks: [],
      reason: 'No pose was detected in the capture.',
    }),
  );
  expect(marks()).toHaveLength(0);
  expect(JSON.stringify(f.screen.toJSON())).toContain(
    'No pose was detected in the capture.',
  );
  await act(async () =>
    f.handlers.onResult({ ...invalid, timestamp_ms: 1000 }),
  );
  expect(marks().length).toBeGreaterThan(0);
  await act(async () => jest.advanceTimersByTime(1501));
  expect(marks()).toHaveLength(0);
  await f.unmount();
});
test('manual shoulder review explains missing raise and has a breadcrumb back', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => f.handlers.onResult(shoulder(0)));
  await f.press('Stop');
  expect(JSON.stringify(f.screen.toJSON())).toContain(
    'No clear raising movement',
  );
  await f.press('Back to Shoulder reach');
  expect(f.preview.active).toBe(false);
  expect(
    f.screen.root.findAll(
      node => node.props.accessibilityLabel === 'Save result',
    ),
  ).toHaveLength(0);
  await f.press('Record');
  expect(f.preview.active).toBe(true);
  await f.unmount();
});
test('changing the analysis source closes the previous stream', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  const replacement = jest.fn(async () => ({ stop: jest.fn() }));
  f.props.media = { ...f.media, startLive: replacement };
  await f.refresh();
  expect(f.stop).toHaveBeenCalledTimes(1);
  expect(replacement).toHaveBeenCalledTimes(1);
  await f.unmount();
});
test('shoulder guidance follows baseline, raising and holding phases', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () => {
    for (const t of [0, 500, 1000]) {
      f.handlers.onResult(shoulder(t));
    }
  });
  expect(JSON.stringify(f.screen.toJSON())).toContain('Raise either arm');
  await act(async () => f.handlers.onResult(shoulder(1500, 170)));
  expect(JSON.stringify(f.screen.toJSON())).toContain('Hold steady');
  await f.unmount();
});
test('without persisted consent Record cannot open the preview or stream', async () => {
  const f = fixture();
  await f.mount(false);
  await f.press('Record');
  expect(f.preview.active).toBe(false);
  expect(f.media.startLive).not.toHaveBeenCalled();
  await f.press('Settings');
  expect(f.props.onSettings).toHaveBeenCalledTimes(1);
  await f.unmount();
});
test('a late starting session is stopped after consent is revoked', async () => {
  const f = fixture();
  let resolve!: (session: { stop: () => void }) => void;
  f.props.media = {
    ...f.media,
    startLive: () =>
      new Promise(value => {
        resolve = value;
      }),
  };
  await f.mount();
  await f.press('Record');
  await f.revoke();
  await act(async () => resolve({ stop: f.stop }));
  expect(f.stop).toHaveBeenCalledTimes(1);
  expect(f.preview.active).toBe(false);
  await f.unmount();
});
test('results for the wrong selected metric cannot be reviewed or saved', async () => {
  const f = fixture();
  await f.mount();
  await f.press('Record');
  await act(async () =>
    f.handlers.onResult({ ...shoulder(0), metric: 'leg_spread' }),
  );
  await f.press('Stop');
  expect(
    f.screen.root.findAll(
      node => node.props.accessibilityLabel === 'Save result',
    ),
  ).toHaveLength(0);
  await f.unmount();
});
test('a pending save blocks Retry and review breadcrumb reset until its review is saved', async () => {
  const f = fixture();
  let complete!: () => void;
  f.save.mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        complete = resolve;
      }),
  );
  await f.mount();
  await f.press('Record');
  await act(async () => f.handlers.onResult(shoulder(0)));
  await f.press('Stop');
  await f.press('Save result');
  const retry = f.screen.root.findAll(
    node => node.props.accessibilityLabel === 'Retry',
  )[0];
  expect(retry.props.accessibilityState.disabled).toBe(true);
  await f.press('Retry');
  expect(f.preview.active).toBe(false);
  expect(f.media.startLive).toHaveBeenCalledTimes(1);
  await f.press('Back to Shoulder reach');
  expect(
    f.screen.root.findAll(
      node => node.props.accessibilityLabel === 'Save result',
    ).length,
  ).toBeGreaterThan(0);
  await act(async () => complete());
  await f.press('Retry');
  expect(f.preview.active).toBe(true);
  await act(async () => f.handlers.onResult(shoulder(0, 15)));
  await f.press('Stop');
  const nextSave = f.screen.root.findAll(
    node => node.props.accessibilityLabel === 'Save result',
  )[0];
  expect(nextSave.props.accessibilityState.disabled).toBe(false);
  await f.press('Save result');
  expect(f.save).toHaveBeenCalledTimes(2);
  await f.unmount();
});
