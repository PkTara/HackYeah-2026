import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  AUDIENCES,
  AUDIENCE_ORDER,
  FILE_LABEL,
  MAX_TYPED,
  buildDocument,
  defaultWeeks,
  explainAudience,
  exportFile,
  filesFor,
  renderText,
  sectionsFor,
  type AudienceId,
  type ExportFile,
  type ExportSnapshot,
  type FileKind,
  type PeriodWeeks,
  type SectionId,
} from '@hackyeah/core';
import type { ShareOutcome } from '@hackyeah/platform';
import {
  AppText,
  Button,
  CheckRow,
  Chip,
  HelpMark,
  Icon,
  PX,
  Panel,
  PixelArt,
  PixelText,
  SampleMark,
  Tag,
  Toggle,
  spacing,
  useTheme,
  useTone,
  useUiSound,
} from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { Crumbs } from '../components/Crumbs';
import { DecisionHelp, ExplanationSheet } from '../components/DecisionHelp';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { AUDIENCE_ICON } from '../export/words';
import { exportRoutes, useExportSnapshot } from '../export/useExportSnapshot';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useSport } from '../state/SportProvider';

const PRIVACY = 'Made on this device. Nothing is sent until you share it.';
const EXAMPLES =
  'This record includes example data. Every export says so at the top.';

/** The breadcrumb chevron, as on the Data hub rows. */
const CHEVRON = ['##...', '.##..', '..##.', '...##', '..##.', '.##..', '##...'];

const PEOPLE: readonly AudienceId[] = AUDIENCE_ORDER.filter(
  id => id !== 'you' && id !== 'data',
);

const PERIODS: readonly { weeks: PeriodWeeks; label: string }[] = [
  { weeks: 2, label: '2 weeks' },
  { weeks: 4, label: '4 weeks' },
  { weeks: 12, label: '12 weeks' },
  { weeks: null, label: 'Everything' },
];

/** Short names for the file tags on each card. */
const FILE_TAG: Readonly<Record<FileKind, string>> = {
  text: 'Text',
  markdown: 'Markdown',
  html: 'Print',
  csv: 'CSV',
  measurementsCsv: 'CSV',
  json: 'JSON',
};

/** Data files show their first lines; documents show more. */
const PREVIEW_LINES: Readonly<Record<FileKind, number>> = {
  text: 80,
  markdown: 80,
  html: 80,
  csv: 20,
  measurementsCsv: 20,
  json: 20,
};

/** One line the person can read; a quiet status for everything else. */
const SHARE_STATUS: Readonly<Record<ShareOutcome, string>> = {
  shared: 'Shared.',
  saved: 'Saved.',
  dismissed: 'Sharing was cancelled.',
  unavailable:
    'This browser has no share sheet. Copy the text or save the file instead.',
  failed: 'Could not share. Copy the text or save the file instead.',
};

function PrivacyLine() {
  return (
    <View style={styles.inline}>
      <Icon name="lock" />
      <AppText variant="caption" style={styles.grow}>
        {PRIVACY}
      </AppText>
    </View>
  );
}

/**
 * Export, step one: who the summary is for. Each reader is one row; its
 * "?" explains why the format looks the way it does.
 */
export function ExportScreen() {
  const { navigate } = useNavigation<RouteName>();
  const { mode, view } = useSport();
  const snapshot = useExportSnapshot(4);
  const routes = exportRoutes(mode);
  const open = (id: AudienceId) => navigate(routes.format, { audience: id });
  const sessions = mode === 'monkey' ? 'climbs' : view.sessions;
  return (
    <TabScreen single>
      <Crumbs />
      <PageHeader
        title="Export"
        subtitle="Pick who it is for. You see the exact words before you share them."
      />
      <Panel variant="quiet">
        <PrivacyLine />
        <AppText variant="caption" muted>
          Built from your {sessions}, sore spots
          {mode === 'monkey' ? ', measurements' : ''} and questions you pick.
          Photos and notes are never included.
        </AppText>
        {snapshot.containsExamples ? <SampleMark text={EXAMPLES} /> : null}
      </Panel>

      <Panel title="People who help you" icon="share">
        {PEOPLE.map((id, index) => (
          <AudienceRow
            key={id}
            id={id}
            snapshot={snapshot}
            onPress={() => open(id)}
            divider={index < PEOPLE.length - 1}
          />
        ))}
      </Panel>

      <Panel title="For you" icon="profile">
        {(['you', 'data'] as const).map((id, index) => (
          <AudienceRow
            key={id}
            id={id}
            snapshot={snapshot}
            onPress={() => open(id)}
            divider={index === 0}
          />
        ))}
      </Panel>
    </TabScreen>
  );
}

/**
 * One reader: icon, name, who it is for, what it holds and its file types.
 * The row opens the format; the "?" beside it opens "Why this format".
 */
function AudienceRow({
  id,
  snapshot,
  onPress,
  divider,
}: {
  id: AudienceId;
  snapshot: ExportSnapshot;
  onPress: () => void;
  divider: boolean;
}) {
  const { colors } = useTheme();
  const tone = useTone();
  const playSound = useUiSound();
  const { mode, view } = useSport();
  const [why, setWhy] = useState(false);
  const audience = AUDIENCES[id];
  const tags = [
    ...new Set(filesFor(audience, snapshot.mode).map(k => FILE_TAG[k])),
  ];
  const explanation = useMemo(
    () => explainAudience(id, snapshot.words, snapshot.mode),
    [id, snapshot.words, snapshot.mode],
  );
  // The coach line names this mode's coach.
  const forWho =
    id === 'coach'
      ? `Your ${mode === 'monkey' ? 'climbing' : view.activity.toLowerCase()} coach.`
      : audience.forWho;
  return (
    <View
      style={[
        styles.audience,
        divider ? { borderBottomColor: colors.surfaceShade } : styles.last,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Export for ${audience.name}`}
        accessibilityHint={forWho}
        onPress={() => {
          playSound('tap');
          onPress();
        }}
        style={styles.grow}
      >
        {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
          <View
            style={[
              styles.audienceBody,
              pressed
                ? { backgroundColor: colors.surfaceShade }
                : hovered
                ? { backgroundColor: colors.surfaceLight }
                : null,
            ]}
          >
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.surfaceShade,
                  borderColor: colors.outline,
                },
              ]}
            >
              <Icon name={AUDIENCE_ICON[id]} scale={3} />
            </View>
            <View style={styles.copy}>
              <PixelText text={audience.name} accessible={false} />
              <AppText variant="caption">{forWho}</AppText>
              <AppText variant="caption" muted>
                {audience.holds}
              </AppText>
              <View style={styles.tags}>
                {tags.map(t => (
                  <Tag key={t} text={t} tone="muted" />
                ))}
              </View>
            </View>
            <PixelArt rows={CHEVRON} colors={{ '#': tone.text }} scale={2} />
          </View>
        )}
      </Pressable>
      <View style={styles.why}>
        <HelpMark
          accessibilityLabel={`Why this format: ${audience.name}`}
          accessibilityHint="Shows who it is for, what goes in and the research behind it"
          onPress={() => setWhy(true)}
        />
      </View>
      <ExplanationSheet
        visible={why}
        onClose={() => setWhy(false)}
        label="Why this format"
        title={`Why this format: ${audience.name}`}
        explanation={explanation}
      />
    </View>
  );
}

/**
 * Export, step two: one reader's summary. Pick the period, what goes in,
 * the questions and the file type; the preview is the exact text that will
 * be shared. Typed text lives only on this screen and is never saved.
 */
export function ExportFormatScreen() {
  const { params } = useNavigation<RouteName>();
  const id: AudienceId =
    AUDIENCE_ORDER.find(a => a === params.audience) ?? AUDIENCE_ORDER[0];
  const audience = AUDIENCES[id];
  const [weeks, setWeeks] = useState<PeriodWeeks>(defaultWeeks(id));
  const snapshot = useExportSnapshot(weeks);
  const mode = snapshot.mode;
  const sections = sectionsFor(audience, mode);
  const files = filesFor(audience, mode);
  const offered = useMemo(
    () => audience.questions(snapshot),
    [audience, snapshot],
  );

  const [include, setInclude] = useState<Partial<Record<SectionId, boolean>>>(
    {},
  );
  const [picked, setPicked] = useState<readonly string[] | null>(null);
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const [kind, setKind] = useState<FileKind>(files[0]);

  const isOn = (section: SectionId) => {
    const def = sections.find(d => d.id === section);
    return !!def && (def.locked || (include[section] ?? def.defaultOn));
  };
  // Questions that no longer fit the record (a flag was cleared) drop out.
  const chosen = (picked ?? offered.filter(q => q.defaultOn).map(q => q.text))
    .filter(q => offered.some(o => o.text === q));
  const choices = useMemo(
    () => ({
      include,
      questions: chosen,
      reason,
      customQuestion: custom,
    }),
    // chosen is rebuilt each render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [include, chosen.join('\n'), reason, custom],
  );
  const file = useMemo(
    () => exportFile(id, kind, snapshot, choices),
    [id, kind, snapshot, choices],
  );
  // The printable page has the same words as the text; the preview and the
  // copy show the words, the file is the page.
  const words = useMemo(
    () =>
      kind === 'html'
        ? renderText(buildDocument(id, snapshot, choices))
        : file.text,
    [kind, id, snapshot, choices, file.text],
  );
  const explanation = useMemo(
    () => explainAudience(id, snapshot.words, mode),
    [id, snapshot.words, mode],
  );

  const togglable = sections.filter(d => !d.locked);
  const locked = sections.filter(d => d.locked);
  const hasQuestions = audience.questionsHeading !== '';

  const togglePick = (text: string) =>
    setPicked(
      offered
        .map(o => o.text)
        .filter(q => (q === text ? !chosen.includes(q) : chosen.includes(q))),
    );

  return (
    <TabScreen single>
      <Crumbs />
      <PageHeader title={audience.name} subtitle={audience.forWho} />

      <Panel title="This format" icon={AUDIENCE_ICON[id]}>
        <AppText>{audience.holds}</AppText>
        <DecisionHelp
          label={`${audience.name} format`}
          title={`Why this format: ${audience.name}`}
          explanation={explanation}
        >
          <AppText variant="caption">Why this format</AppText>
        </DecisionHelp>
        <AppText variant="caption" muted>
          {audience.notThis}
        </AppText>
        <PrivacyLine />
        {snapshot.containsExamples ? <SampleMark text={EXAMPLES} /> : null}
      </Panel>

      <Panel title="Period" icon="clock">
        <View style={styles.chips}>
          {PERIODS.map(p => (
            <Chip
              key={p.label}
              label={p.label}
              selected={weeks === p.weeks}
              onPress={() => setWeeks(p.weeks)}
            />
          ))}
        </View>
        <AppText variant="caption" muted>
          {snapshot.sessions.length === 0
            ? `No ${snapshot.words.sessions} logged from ${snapshot.period.from} to ${snapshot.period.to}.`
            : `${snapshot.period.from} to ${snapshot.period.to}: ${
                snapshot.sessions.length
              } ${
                snapshot.sessions.length === 1
                  ? snapshot.words.session
                  : snapshot.words.sessions
              }.`}
        </AppText>
      </Panel>

      {togglable.length > 0 ? (
        <Panel title="What to include" icon="check">
          {togglable.map(d => (
            <Toggle
              key={d.id}
              name={d.label}
              detail={d.detail}
              value={isOn(d.id)}
              onValueChange={on => setInclude(x => ({ ...x, [d.id]: on }))}
            />
          ))}
          {locked.length > 0 ? (
            <AppText variant="caption" muted>
              Always included: {locked.map(d => d.label).join(', ')}.
            </AppText>
          ) : null}
        </Panel>
      ) : null}

      {hasQuestions ? (
        <Panel title={audience.questionsHeading} icon="flag">
          {isOn('reason') ? (
            <TypedField
              label="Why are you going? (optional)"
              placeholder="Pain in my left knee when I run."
              value={reason}
              onChange={setReason}
            />
          ) : null}
          {offered.map(q => (
            <CheckRow
              key={q.text}
              name={q.text}
              checked={chosen.includes(q.text)}
              tone="agree"
              onPress={() => togglePick(q.text)}
            />
          ))}
          <TypedField
            label={id === 'family' ? 'Add your own line' : 'Add your own question'}
            placeholder={
              id === 'family'
                ? 'Call me after my long run.'
                : 'What should I ask next time?'
            }
            value={custom}
            onChange={setCustom}
          />
        </Panel>
      ) : null}

      <Panel title="Format" icon="log">
        <View style={styles.chips}>
          {files.map(k => (
            <Chip
              key={k}
              label={FILE_LABEL[k]}
              selected={kind === k}
              onPress={() => setKind(k)}
            />
          ))}
        </View>
        <AppText variant="caption" muted>
          File: {file.name}
        </AppText>
      </Panel>

      <Preview kind={kind} text={words} />

      <ShareActions title={audience.name} kind={kind} file={file} words={words} />
    </TabScreen>
  );
}

/** A one-line text field for typed text that is never saved. */
function TypedField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <AppText variant="caption" style={styles.strong}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={MAX_TYPED}
        accessibilityLabel={label}
        accessibilityHint="Not saved."
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.outline}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceLight,
            borderColor: colors.outline,
            color: colors.text,
          },
        ]}
      />
      <AppText variant="caption" muted>
        Not saved. Cleared when you leave this page.
      </AppText>
    </View>
  );
}

/** The exact words, on a paper-like sheet. Long files fold after a few lines. */
function Preview({ kind, text }: { kind: FileKind; text: string }) {
  const { colors } = useTheme();
  const [all, setAll] = useState(false);
  const lines = text.replace(/\n$/, '').split('\n');
  const limit = PREVIEW_LINES[kind];
  const folded = !all && lines.length > limit;
  return (
    <Panel title="Preview" icon="tests">
      {kind === 'html' ? (
        <AppText variant="caption" muted>
          The printable page has the same words, laid out for paper.
        </AppText>
      ) : null}
      <View
        style={[
          styles.paper,
          { backgroundColor: colors.surfaceLight, borderColor: colors.outline },
        ]}
      >
        <AppText
          selectable
          variant="caption"
          testID="export-preview"
          style={styles.paperText}
        >
          {folded ? lines.slice(0, limit).join('\n') : lines.join('\n')}
        </AppText>
      </View>
      {lines.length > limit ? (
        <View style={styles.inline}>
          <AppText variant="caption" muted style={styles.grow}>
            {folded
              ? `And ${lines.length - limit} more lines. Sharing sends them all.`
              : `${lines.length} lines.`}
          </AppText>
          <Button
            title={folded ? 'Show all' : 'Show fewer'}
            variant="secondary"
            small
            onPress={() => setAll(x => !x)}
          />
        </View>
      ) : null}
    </Panel>
  );
}

/**
 * Share, copy, save and print, as far as this device can. Each result is
 * one quiet line under the buttons; nothing pops up.
 */
function ShareActions({
  title,
  kind,
  file,
  words,
}: {
  title: string;
  kind: FileKind;
  file: ExportFile;
  words: string;
}) {
  const { share } = useCapabilities();
  const [status, setStatus] = useState('');
  if (!share) {
    return (
      <Panel title="Share" icon="share">
        <AppText>Select the preview text to copy it.</AppText>
      </Panel>
    );
  }
  const run = async (action: () => Promise<string>) => {
    setStatus('');
    setStatus(await action());
  };
  return (
    <Panel title="Share" icon="share">
      <View style={styles.actions}>
        <Button
          title="Share"
          icon="share"
          onPress={() =>
            run(async () => {
              const outcome = await share.share({
                title: `${title}: ${file.name}`,
                text: words,
                file,
              });
              return SHARE_STATUS[outcome];
            })
          }
        />
        {share.canCopy ? (
          <Button
            title="Copy"
            variant="secondary"
            onPress={() =>
              run(async () =>
                (await share.copy(words))
                  ? 'Copied.'
                  : 'Could not copy. Select the preview text instead.',
              )
            }
          />
        ) : null}
        {share.download ? (
          <Button
            title="Save file"
            variant="secondary"
            onPress={() =>
              run(async () => {
                const outcome = await share.download!(file);
                return outcome === 'saved'
                  ? `Saved ${file.name}.`
                  : outcome === 'dismissed'
                  ? ''
                  : 'Could not save the file. Copy the text instead.';
              })
            }
          />
        ) : null}
        {share.print && kind === 'html' ? (
          <Button
            title="Print or save as PDF"
            variant="secondary"
            onPress={() =>
              run(async () =>
                (await share.print!(file.text))
                  ? 'Print view opened.'
                  : 'Could not open the print view. Save the file and print it from there.',
              )
            }
          />
        ) : null}
      </View>
      <AppText
        variant="caption"
        accessibilityLiveRegion="polite"
        aria-live="polite"
        testID="export-status"
      >
        {status}
      </AppText>
      <AppText variant="caption" muted>
        You choose where it goes. The app does not upload it.
      </AppText>
    </Panel>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strong: { fontWeight: '800' },
  audience: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: PX,
    marginHorizontal: -6,
  },
  last: { borderBottomWidth: 0, borderBottomColor: 'transparent' },
  audienceBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  badge: {
    width: 48,
    height: 48,
    borderWidth: PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  why: { paddingTop: 10, paddingRight: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { gap: spacing.xs },
  input: {
    minHeight: 44,
    borderWidth: PX,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  paper: { borderWidth: PX, padding: 12 },
  paperText: { lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
