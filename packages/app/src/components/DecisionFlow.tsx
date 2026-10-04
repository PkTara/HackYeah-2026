import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  flowText,
  type DecisionFlow as Flow,
  type FlowCheck,
  type FlowInput,
  type FlowNode,
} from '@hackyeah/core';
import {
  AppText,
  Dolphin,
  Gazelle,
  Icon,
  Monkey,
  PX,
  PixelArt,
  PixelBox,
  PixelText,
  ToneContext,
  isIconName,
  useTheme,
  useWorld,
  type Tone,
} from '@hackyeah/ui';

/** Dark ink for text on the light green holds and the banana boxes. */
const INK = '#22180F';
const HOLD_TONE: Tone = { text: INK, textMuted: '#2D4520' };
const BANANA_TONE: Tone = { text: INK, textMuted: '#5C4513' };
const WOOD_TONE: Tone = { text: '#FFF4DC', textMuted: '#E8CFA6' };

/** Widest the picture gets, so it stays a tall vine in a wide sheet. */
const GRAPH_MAX = 440;
const VINE = PX * 2;

/** A small leaf on the vine. 'V' is the leaf, 'l' its light side. */
const LEAF = ['...VV', '.VVlV', 'VlVV.', 'V....'];
const LEAF_FLIP = LEAF.map(row => [...row].reverse().join(''));
const ARROW = ['#####', '.###.', '..#..'];

/**
 * A decision drawn as a jungle vine: the records that fed it hang at the
 * top, the vine runs down through green holds (steps) and wooden signs
 * (yes/no checks), and the pet waits at the bottom with the result.
 *
 * Screen readers get the whole flow as one sentence list from core's
 * flowText; the drawing itself is hidden from them. Every check says YES or
 * NO in words, and the side not taken is dashed and marked "not taken", so
 * colour is never the only clue.
 */
export function DecisionFlow({ flow }: { flow: Flow }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Flow chart. ${flowText(flow).join(' ')}`}
      style={styles.graph}
    >
      {flow.inputs.length > 0 ? <Inputs inputs={flow.inputs} /> : null}
      {flow.nodes.map((node, index) => (
        <View key={index} style={styles.stretch}>
          {node.feed ? (
            <Feed input={node.feed} />
          ) : index > 0 || flow.inputs.length > 0 ? (
            <Vine leaf={index} />
          ) : null}
          {node.type === 'check' ? <Check node={node} /> : <Step node={node} />}
        </View>
      ))}
      <Vine leaf={flow.nodes.length} />
      <Result result={flow.result} />
    </View>
  );
}

/** The input chips with a short funnel that gathers them into the vine. */
function Inputs({ inputs }: { inputs: readonly FlowInput[] }) {
  const c = useTheme().colors;
  return (
    <View style={styles.stretch}>
      <View style={styles.chips}>
        {inputs.map((input, index) => (
          <InputChip key={index} input={input} />
        ))}
      </View>
      {inputs.length > 1 ? (
        <View style={[styles.funnel, { borderColor: c.leaf }]} />
      ) : null}
    </View>
  );
}

export function InputChip({ input }: { input: FlowInput }) {
  const c = useTheme().colors;
  const tone = input.key
    ? BANANA_TONE
    : { text: c.text, textMuted: c.textMuted };
  return (
    <ToneContext.Provider value={tone}>
      <PixelBox
        fill={input.key ? c.primary : c.surfaceLight}
        outline={c.outline}
        shade={input.key ? c.primaryShade : c.surfaceShade}
        contentStyle={styles.chip}
        style={styles.shrink}
      >
        {isIconName(input.icon) ? (
          <Icon name={input.icon} color={tone.text} />
        ) : null}
        <View style={styles.shrink}>
          <AppText variant="caption" style={styles.strong}>
            {input.label}
          </AppText>
          {input.value ? (
            <AppText variant="caption">{input.value}</AppText>
          ) : null}
        </View>
      </PixelBox>
    </ToneContext.Provider>
  );
}

/** A vine piece with a leaf, ending in a small arrow head. */
function Vine({ leaf }: { leaf: number }) {
  const c = useTheme().colors;
  const leafColors = { V: c.leaf, l: c.leafLight };
  return (
    <View style={styles.vineBox}>
      <View style={[styles.vine, { backgroundColor: c.leaf }]} />
      <PixelArt
        rows={leaf % 2 ? LEAF : LEAF_FLIP}
        colors={leafColors}
        scale={PX}
        style={[styles.leaf, leaf % 2 ? styles.leafRight : styles.leafLeft]}
      />
      <PixelArt rows={ARROW} colors={{ '#': c.leaf }} scale={PX - 1} />
    </View>
  );
}

/**
 * A record that joins the flow part way down, such as a flagged finger at
 * the flag check: the chip sits to the left and its own vine joins the main
 * one before the next sign.
 */
function Feed({ input }: { input: FlowInput }) {
  const c = useTheme().colors;
  return (
    <View style={styles.feed}>
      <View style={[styles.feedVine, { backgroundColor: c.leaf }]} />
      <View style={styles.feedHalf}>
        <InputChip input={input} />
        <View style={[styles.feedJoin, { backgroundColor: c.leaf }]} />
      </View>
      <View style={styles.feedArrow}>
        <PixelArt rows={ARROW} colors={{ '#': c.leaf }} scale={PX - 1} />
      </View>
    </View>
  );
}

/** A green hold on the vine: one thing the app does. */
function Step({ node }: { node: Extract<FlowNode, { type: 'step' }> }) {
  const c = useTheme().colors;
  return (
    <Node team={node.team}>
      <ToneContext.Provider value={HOLD_TONE}>
        <PixelBox
          fill={c.leafLight}
          outline={c.outline}
          shade={c.leaf}
          contentStyle={styles.nodeBody}
        >
          <AppText variant="caption" style={styles.label}>
            {node.label}
          </AppText>
          {node.detail ? (
            <AppText variant="caption" muted style={styles.center}>
              {node.detail}
            </AppText>
          ) : null}
        </PixelBox>
      </ToneContext.Provider>
    </Node>
  );
}

/** A wooden sign with a question, then the two ways down. */
function Check({ node }: { node: FlowCheck }) {
  const c = useTheme().colors;
  const yes = node.taken === 'yes';
  return (
    <View style={styles.stretch}>
      <Node team={node.team}>
        <ToneContext.Provider value={WOOD_TONE}>
          <PixelBox
            fill={c.bark}
            outline={c.outline}
            light={c.barkLight}
            shade={c.barkDark}
            contentStyle={[styles.nodeBody, styles.sign]}
          >
            <PixelText
              text="?"
              scale={3}
              color={c.primary}
              accessible={false}
            />
            <AppText style={[styles.label, styles.shrink]}>
              {node.label}
            </AppText>
          </PixelBox>
        </ToneContext.Provider>
      </Node>
      <Split taken={node.taken} />
      <View style={styles.branches}>
        <Branch word="Yes" text={node.yes} taken={yes} detail={node.detail} />
        <Branch word="No" text={node.no} taken={!yes} detail={node.detail} />
      </View>
      <Join taken={node.taken} />
    </View>
  );
}

/** Vine from the sign down to both branches; the untaken side is faint. */
function Split({ taken }: { taken: 'yes' | 'no' }) {
  const c = useTheme().colors;
  const live = { backgroundColor: c.leaf };
  const faint = { backgroundColor: c.textMuted, opacity: 0.45 };
  return (
    <View style={styles.split}>
      <View style={[styles.splitStem, live]} />
      <View
        style={[
          styles.splitBar,
          styles.leftHalf,
          taken === 'yes' ? live : faint,
        ]}
      />
      <View
        style={[
          styles.splitBar,
          styles.rightHalf,
          taken === 'no' ? live : faint,
        ]}
      />
      <View
        style={[
          styles.splitDrop,
          styles.dropLeft,
          taken === 'yes' ? live : faint,
        ]}
      />
      <View
        style={[
          styles.splitDrop,
          styles.dropRight,
          taken === 'no' ? live : faint,
        ]}
      />
    </View>
  );
}

/** The taken branch's vine back to the middle, so the flow goes on. */
function Join({ taken }: { taken: 'yes' | 'no' }) {
  const c = useTheme().colors;
  const live = { backgroundColor: c.leaf };
  return (
    <View style={styles.split}>
      <View
        style={[
          styles.splitDrop,
          taken === 'yes' ? styles.dropLeft : styles.dropRight,
          live,
          styles.joinDrop,
        ]}
      />
      <View
        style={[
          styles.splitBar,
          styles.joinBar,
          taken === 'yes' ? styles.leftHalf : styles.rightHalf,
          live,
        ]}
      />
      <View style={[styles.joinStem, live]} />
    </View>
  );
}

function Branch({
  word,
  text,
  taken,
  detail,
}: {
  word: 'Yes' | 'No';
  text: string;
  taken: boolean;
  detail?: string;
}) {
  const c = useTheme().colors;
  if (!taken) {
    return (
      <View
        style={[styles.branch, styles.skipped, { borderColor: c.textMuted }]}
      >
        <View style={styles.branchHead}>
          <PixelText
            text={word.toUpperCase()}
            color={c.textMuted}
            accessible={false}
          />
          <AppText variant="caption" muted>
            not taken
          </AppText>
        </View>
        <AppText variant="caption" muted>
          {text}
        </AppText>
      </View>
    );
  }
  return (
    <ToneContext.Provider value={BANANA_TONE}>
      <PixelBox
        fill={c.primary}
        outline={c.outline}
        light="#FFE58A"
        shade={c.primaryShade}
        style={styles.branchFlex}
        contentStyle={styles.branchBody}
      >
        <View style={styles.branchHead}>
          <PixelText text={word.toUpperCase()} color={INK} accessible={false} />
          <Icon name="check" color={INK} />
        </View>
        <AppText variant="caption" style={styles.strong}>
          {text}
        </AppText>
        {detail ? <AppText variant="caption">{detail}</AppText> : null}
      </PixelBox>
    </ToneContext.Provider>
  );
}

/** Centres a node and pins the team stamp to its top edge. */
function Node({ team, children }: { team?: boolean; children: ReactNode }) {
  return (
    <View style={styles.node}>
      {children}
      {team ? (
        <View style={styles.stamp}>
          <TeamStamp />
        </View>
      ) : null}
    </View>
  );
}

/** "Team rule": a choice the team made, not something from a study. */
export function TeamStamp() {
  const c = useTheme().colors;
  return (
    <View
      style={[
        styles.stampBox,
        { backgroundColor: c.surface, borderColor: c.outline },
      ]}
    >
      <PixelText text="TEAM RULE" color={c.text} accessible={false} />
    </View>
  );
}

/** The pet holding up the outcome at the foot of the vine. */
function Result({ result }: { result: Flow['result'] }) {
  const c = useTheme().colors;
  const world = useWorld();
  const pet =
    world === 'savanna' ? (
      <Gazelle scale={2} still />
    ) : world === 'ocean' ? (
      <Dolphin scale={2} still />
    ) : (
      <Monkey scale={2} still />
    );
  return (
    <ToneContext.Provider value={BANANA_TONE}>
      <PixelBox
        fill={c.primary}
        outline={c.outline}
        light="#FFE58A"
        shade={c.primaryShade}
        shadow={c.outline}
        lift={PX}
        style={styles.node}
        contentStyle={styles.result}
      >
        {pet}
        <View style={styles.resultText}>
          <PixelText
            text={result.label.toUpperCase()}
            color="#5C4513"
            accessible={false}
          />
          <View style={styles.resultValue}>
            {isIconName(result.icon) ? (
              <Icon name={result.icon} color={INK} scale={2} />
            ) : null}
            <PixelText
              text={result.value.toUpperCase()}
              scale={result.value.length > 14 ? 2 : 3}
              color={INK}
              wrap
              accessible={false}
              style={styles.shrink}
            />
          </View>
        </View>
      </PixelBox>
    </ToneContext.Provider>
  );
}

const STAMP_H = 22;

const styles = StyleSheet.create({
  graph: {
    width: '100%',
    maxWidth: GRAPH_MAX,
    alignSelf: 'center',
    alignItems: 'center',
  },
  stretch: { width: '100%', alignItems: 'center' },
  shrink: { flexShrink: 1 },
  strong: { fontWeight: '800' },
  center: { textAlign: 'center' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  funnel: {
    width: '66%',
    height: 12,
    borderLeftWidth: VINE,
    borderRightWidth: VINE,
    borderBottomWidth: VINE,
  },
  vineBox: {
    height: 30,
    width: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  vine: { position: 'absolute', top: 0, bottom: 4, width: VINE },
  leaf: { position: 'absolute', top: 2 },
  leafLeft: { right: 22 },
  leafRight: { left: 22 },
  feed: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 26,
  },
  feedVine: {
    position: 'absolute',
    top: 0,
    bottom: 4,
    left: '50%',
    marginLeft: -PX,
    width: VINE,
  },
  feedHalf: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: PX,
  },
  feedJoin: { flex: 1, minWidth: 10, height: VINE },
  feedArrow: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -((PX - 1) * 5) / 2,
    alignItems: 'center',
  },
  node: { width: '100%', paddingTop: 0 },
  nodeBody: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 2,
  },
  label: { fontWeight: '800', textAlign: 'center' },
  sign: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  stamp: { position: 'absolute', top: -STAMP_H / 2, right: 8 },
  stampBox: {
    height: STAMP_H,
    borderWidth: PX - 1,
    paddingHorizontal: 5,
    justifyContent: 'center',
  },
  split: { width: '100%', height: 16 },
  splitStem: {
    position: 'absolute',
    top: 0,
    height: 8,
    left: '50%',
    marginLeft: -PX,
    width: VINE,
  },
  splitBar: { position: 'absolute', top: 6, height: VINE },
  leftHalf: { left: '25%', right: '50%', marginRight: -PX },
  rightHalf: { left: '50%', right: '25%', marginLeft: -PX },
  splitDrop: { position: 'absolute', top: 6, bottom: 0, width: VINE },
  dropLeft: { left: '25%', marginLeft: -PX },
  dropRight: { left: '75%', marginLeft: -PX },
  joinDrop: { top: 0, bottom: 8 },
  joinBar: { top: 8 },
  joinStem: {
    position: 'absolute',
    top: 8,
    bottom: 0,
    left: '50%',
    marginLeft: -PX,
    width: VINE,
  },
  branches: { width: '100%', flexDirection: 'row', gap: 8 },
  branch: { flex: 1, padding: 8, gap: 2 },
  branchFlex: { flex: 1 },
  branchBody: { padding: 8, gap: 2 },
  skipped: { borderWidth: 2, borderStyle: 'dashed' },
  branchHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
  },
  resultText: { flex: 1, gap: 6 },
  resultValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
