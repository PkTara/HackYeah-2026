/**
 * A decision drawn as a small flow chart: the user's records feed in at the
 * top, pass through steps and yes/no checks, and end in one result. The app
 * draws it as a vine; this file only holds the words and which way each
 * check went, so the picture can be tested without drawing anything.
 *
 * Every flow sits next to the plain text rule of the same explanation, which
 * stays the accessible version. Explanations from the server have no flow.
 */

/**
 * A picture hint, not a picture: a wall ("slab"), a session kind ("tempo"),
 * or one of "flag", "camera", "ruler", "banana", "check", "tests". The app
 * maps it to a pixel icon and skips names it does not know.
 */
export type FlowIcon = string;

/** One thing from the user's records that feeds into the decision. */
export type FlowInput = Readonly<{
  /** First words, bold: "Slab". */
  label: string;
  /** The number behind it: "5 of 6 sent". */
  value?: string;
  icon?: FlowIcon;
  /** The input the result is about, such as the wall that became the focus. */
  key?: boolean;
}>;

export type FlowStep = Readonly<{
  type: 'step';
  /** What happens here, a few words: "Count climbs on each wall". */
  label: string;
  /** The numbers at this step, when they help. */
  detail?: string;
  /** A product choice made by the team, not taken from a study. */
  team?: boolean;
  /** A record that joins the flow at this step, drawn beside it. */
  feed?: FlowInput;
}>;

export type FlowCheck = Readonly<{
  type: 'check';
  /** A yes or no question: "Every wall has 3+ climbs?" */
  label: string;
  /** Which way this decision went. */
  taken: 'yes' | 'no';
  /** What happens on each side. */
  yes: string;
  no: string;
  /** The numbers behind the answer, shown on the side that was taken. */
  detail?: string;
  team?: boolean;
  feed?: FlowInput;
}>;

export type FlowNode = FlowStep | FlowCheck;

export type DecisionFlow = Readonly<{
  /** Records that feed in at the top. */
  inputs: readonly FlowInput[];
  /** Top to bottom. */
  nodes: readonly FlowNode[];
  /** What came out: "Focus" and "Vertical". */
  result: Readonly<{ label: string; value: string; icon?: FlowIcon }>;
}>;

const isText = (value: unknown, max = 400): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;
const optionalText = (value: unknown) => value === undefined || isText(value);

function isInput(value: unknown): value is FlowInput {
  const input = value as Partial<FlowInput> | null;
  return (
    !!input &&
    isText(input.label) &&
    optionalText(input.value) &&
    optionalText(input.icon)
  );
}

function isNode(value: unknown): value is FlowNode {
  const node = value as Partial<FlowCheck> | Partial<FlowStep> | null;
  if (
    !node ||
    !isText(node.label) ||
    !optionalText(node.detail) ||
    (node.feed !== undefined && !isInput(node.feed))
  ) {
    return false;
  }
  if (node.type === 'step') {
    return true;
  }
  const check = node as Partial<FlowCheck>;
  return (
    node.type === 'check' &&
    (check.taken === 'yes' || check.taken === 'no') &&
    isText(check.yes) &&
    isText(check.no)
  );
}

/** A flow is only drawn when its shape is sound; otherwise the text shows. */
export function isDecisionFlow(value: unknown): value is DecisionFlow {
  const flow = value as Partial<DecisionFlow> | null;
  return (
    !!flow &&
    Array.isArray(flow.inputs) &&
    flow.inputs.length <= 16 &&
    flow.inputs.every(isInput) &&
    Array.isArray(flow.nodes) &&
    flow.nodes.length > 0 &&
    flow.nodes.length <= 12 &&
    flow.nodes.every(isNode) &&
    !!flow.result &&
    isText(flow.result.label) &&
    isText(flow.result.value) &&
    optionalText(flow.result.icon)
  );
}

const inputText = (input: FlowInput) =>
  input.value ? `${input.label}, ${input.value}` : input.label;
const stop = (text: string) => (/[.?!]$/.test(text) ? text : `${text}.`);

/**
 * The flow read out in order, one sentence per line: what a screen reader
 * hears for the picture.
 */
export function flowText(flow: DecisionFlow): string[] {
  const out: string[] = [];
  if (flow.inputs.length) {
    out.push(
      stop(`From your records: ${flow.inputs.map(inputText).join('; ')}`),
    );
  }
  flow.nodes.forEach((node, index) => {
    const prefix = `Step ${index + 1}`;
    if (node.feed) {
      out.push(stop(`Also uses: ${inputText(node.feed)}`));
    }
    if (node.type === 'step') {
      out.push(
        stop(
          `${prefix}: ${node.label}${node.detail ? `. ${node.detail}` : ''}`,
        ),
      );
    } else {
      const answer = node.taken === 'yes' ? node.yes : node.no;
      out.push(
        stop(
          `${prefix}: ${node.label} ${capital(node.taken)}, so ${lower(
            answer,
          )}${node.detail ? `. ${node.detail}` : ''}`,
        ),
      );
    }
  });
  out.push(stop(`Result: ${flow.result.label}, ${flow.result.value}`));
  return out;
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
