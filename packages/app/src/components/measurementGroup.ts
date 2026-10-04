import type { AssessmentMetric } from '@hackyeah/core';

export function measurementGroup(metric?: string): {
  metric: string;
  title: string;
  metrics: AssessmentMetric[];
} {
  if (metric === 'finger_force') {
    return { metric, title: 'Finger strength', metrics: ['finger_force'] };
  }
  if (metric?.startsWith('shoulder_reach')) {
    return {
      metric: 'shoulder_reach',
      title: 'Shoulder reach',
      metrics: ['shoulder_reach_left', 'shoulder_reach_right'],
    };
  }
  return { metric: 'leg_spread', title: 'Leg spread', metrics: ['leg_spread'] };
}
