/**
 * How each value got into the record, as a short inline label and one
 * legend line. Exports show only the labels they use.
 */
import type { Provenance } from './types';

export const PROVENANCE_ORDER: readonly Provenance[] = [
  'entered',
  'timed_in_app',
  'measured_tool',
  'camera_estimate',
  'app_rule',
  'example',
];

/** Written in square brackets after a value: "[entered]". */
export const LABEL: Readonly<Record<Provenance, string>> = {
  entered: 'entered',
  timed_in_app: 'timed',
  measured_tool: 'my tool',
  camera_estimate: 'camera',
  app_rule: 'app',
  example: 'example',
};

export const LEGEND: Readonly<Record<Provenance, string>> = {
  entered: 'I typed or tapped it in myself.',
  timed_in_app: 'I did the test and the app timed or counted it.',
  measured_tool: 'I measured it with my own tape or gauge and typed it in.',
  camera_estimate:
    'an angle the app estimated in a flat camera image. Not a measured joint range.',
  app_rule: 'worked out by the app from my records with a fixed rule.',
  example: 'made-up demo data, not about a real person.',
};

/** Collects the labels a document uses, so its legend lists only those. */
export type Labeler = Readonly<{
  /** " [entered]", and remembers that it was used. */
  tag: (p: Provenance) => string;
  legend: () => string[];
}>;

export function createLabeler(): Labeler {
  const used = new Set<Provenance>();
  return {
    tag: p => {
      used.add(p);
      return ` [${LABEL[p]}]`;
    },
    legend: () =>
      PROVENANCE_ORDER.filter(p => used.has(p)).map(
        p => `[${LABEL[p]}] ${LEGEND[p]}`,
      ),
  };
}

/** A count over several records is example data if any of them is. */
export function provenanceOfAll(
  records: readonly Readonly<{ provenance: Provenance }>[],
): Provenance {
  return records.some(r => r.provenance === 'example') ? 'example' : 'entered';
}
