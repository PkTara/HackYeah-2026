/**
 * Where each pushed screen sits in the app, from its tab down to itself.
 * Breadcrumbs show this trail rather than the history, so a web link
 * straight to a finger close-up still starts with Hands.
 */
import {
  ANATOMY_LAYERS,
  BASELINE_TESTS,
  FINGERS,
  type Finger,
  type Side,
} from '@hackyeah/core';
import { measurementGroup } from '../components/measurementGroup';
import { FINGER_NAME, SIDE_NAME, fingerLabel } from '../labels';
import type { TrailStep } from './Navigator';
import type { RouteName } from './routes';

type Params = Readonly<Record<string, string>>;

export type Crumb = TrailStep<RouteName> &
  Readonly<{
    label: string;
    /** For narrow screens: "Right ring" for "Right ring finger". */
    short?: string;
  }>;

const tab = (route: RouteName): Crumb => ({
  route: route === 'Tests' ? 'Data' : route,
  label: route === 'Tests' ? 'Data' : route,
});

/** The side and finger in the params, with the finger close-up's defaults. */
export function fingerParams(params: Params): { side: Side; finger: Finger } {
  return {
    side: params.side === 'left' ? 'left' : 'right',
    finger: FINGERS.find(f => f === params.finger) ?? 'index',
  };
}

function fingerCrumb(params: Params): Crumb {
  const { side, finger } = fingerParams(params);
  return {
    route: 'Finger',
    params: { side, finger },
    label: fingerLabel(side, finger),
    short: `${SIDE_NAME[side]} ${FINGER_NAME[finger].toLowerCase()}`,
  };
}

/** The trail for a screen; empty for the tabs themselves. */
export function trailFor(route: RouteName, params: Params): Crumb[] {
  switch (route) {
    case 'Tests':
      return [tab('Data')];
    case 'Finger':
      return [tab('Hands'), fingerCrumb(params)];
    case 'Anatomy': {
      // Opened from a finger close-up it sits under that finger.
      const here = { route, params };
      const fromFinger = FINGERS.some(f => f === params.finger);
      return fromFinger
        ? [tab('Hands'), fingerCrumb(params), { ...here, label: 'Anatomy' }]
        : [tab('Hands'), { ...here, label: 'Hand anatomy', short: 'Anatomy' }];
    }
    case 'Evidence':
      return [tab('Profile'), { route, params, label: 'Evidence' }];
    case 'About': {
      if (params.from === 'Settings') {
        const settingsParams = { ...params };
        delete settingsParams.from;
        delete settingsParams.settingsFrom;
        if (params.settingsFrom) {
          settingsParams.from = params.settingsFrom;
        }
        return [
          ...trailFor('Settings', settingsParams),
          { route, params, label: 'About' },
        ];
      }
      return [tab('Data'), { route, params, label: 'About' }];
    }
    case 'Settings':
      return [
        ...(params.from === 'Assessment'
          ? trailFor('Assessment', { metric: params.metric ?? 'leg_spread' })
          : params.from === 'HandCapture'
          ? trailFor('HandCapture', params)
          : [tab('Data')]),
        { route, params, label: 'Settings' },
      ];
    case 'BodyReach':
      return [tab('Data'), { route, label: 'Body & reach' }];
    case 'Activity':
      return [tab('Data'), { route, label: 'Activity & integrations' }];
    case 'MeasurementDetail': {
      const group = measurementGroup(params.metric);
      return [
        tab('Data'),
        { route, params: { metric: group.metric }, label: group.title },
      ];
    }
    case 'FingerStrength':
      return [tab('Data'), { route, label: 'Finger strength' }];
    case 'Assessment':
      return [
        tab('Data'),
        {
          route,
          params,
          label:
            params.metric === 'shoulder_reach'
              ? 'Shoulder reach'
              : 'Leg spread',
          short: 'Camera',
        },
      ];
    case 'HandCapture': {
      // Opened from a finger close-up it sits under that finger.
      const here = { route, params, label: 'Add a photo', short: 'Photo' };
      return FINGERS.some(f => f === params.finger)
        ? [tab('Hands'), fingerCrumb(params), here]
        : [tab('Hands'), here];
    }
    case 'Test': {
      const test =
        BASELINE_TESTS.find(t => t.id === params.id) ?? BASELINE_TESTS[0];
      return [tab('Tests'), { route, params, label: test.name }];
    }
    default:
      return [];
  }
}

/** Params the anatomy screen understands, for links into it. */
export function anatomyParams(o: {
  side: Side;
  finger?: Finger;
  spot?: string;
  layer?: (typeof ANATOMY_LAYERS)[number];
}): Params {
  const out: Record<string, string> = { side: o.side };
  if (o.finger) {
    out.finger = o.finger;
  }
  if (o.spot) {
    out.spot = o.spot;
  }
  if (o.layer) {
    out.layer = o.layer;
  }
  return out;
}
