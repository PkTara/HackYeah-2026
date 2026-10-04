/**
 * The input journey: record something, see what it changed, and get one
 * next step. Also the readiness state each Data item shows.
 */
import { act } from 'react-test-renderer';
import { emptyGame } from '@hackyeah/core';
import { control, press, render, setup, text } from '../testing/cameraFixture';

it('after logging a climb, says what changed and points to the profile until the next climb starts', async () => {
  const screen = await render(
    setup({ state: { ...emptyGame, onboardingSkipped: true } }),
    'Log',
  );
  await press(screen, 'Log climb');
  await press(screen, 'Vertical', 'Controlled', 'V3', 'Sent', 'Save climb');
  expect(text(screen)).toContain('Saved V3 vertical, sent');
  expect(text(screen)).toContain(
    'Vertical: 1 of 1 sent. 2 more climbs here and the monkey can compare it.',
  );
  expect(text(screen)).toContain('Your focus');
  // Starting the next climb clears the note.
  await press(screen, 'Not yet');
  expect(text(screen)).not.toContain('Saved V3 vertical');
  await press(screen, 'Save climb', 'See your profile');
  expect(control(screen, 'Save climb')).toBeUndefined();
  expect(text(screen)).toContain('From your logged climbs only');
  await act(async () => screen.unmount());
});

it('after logging a climb, See your climbs returns to the list with the climb framed', async () => {
  const screen = await render(
    setup({ state: { ...emptyGame, onboardingSkipped: true } }),
    'Log',
  );
  expect(text(screen)).toContain('No climbs logged yet.');
  // The empty list offers a second way in.
  expect(control(screen, 'Log a climb')).toBeDefined();
  await press(screen, 'Log climb');
  expect(control(screen, 'Save climb')).toBeDefined();
  expect(control(screen, 'Close')).toBeDefined();
  await press(screen, 'Vertical', 'Controlled', 'V3', 'Sent', 'Save climb');
  await press(screen, 'See your climbs');
  expect(control(screen, 'Save climb')).toBeUndefined();
  expect(text(screen)).toContain('1 climb this week: 1 sent.');
  const framed = screen.root.findAll(
    n =>
      typeof n.props.accessibilityLabel === 'string' &&
      n.props.accessibilityLabel.startsWith('Just saved. Climb, 2026-10-03'),
  );
  expect(framed.length).toBeGreaterThan(0);
  // Today has it too; nothing was logged in the rest of the month.
  await press(screen, 'Today');
  expect(text(screen)).toContain('1 climb today: 1 sent.');
  await act(async () => screen.unmount());
});

it('shows an empty state with a way to log for a filter with no climbs', async () => {
  const screen = await render(
    setup({
      state: {
        ...emptyGame,
        onboardingSkipped: true,
        logs: [
          {
            id: 'old',
            date: '2026-09-01',
            terrain: 'slab',
            movements: ['controlled'],
            holds: [],
            grade: 'V2',
            sent: true,
          },
        ],
      },
    }),
    'Log',
  );
  // This week is empty, so the list opens on all climbs.
  expect(text(screen)).toContain('1 climb in total: 1 sent.');
  await press(screen, 'Today');
  expect(text(screen)).toContain('No climbs today. Log one.');
  await press(screen, 'Log a climb');
  expect(control(screen, 'Save climb')).toBeDefined();
  await press(screen, 'Close');
  expect(control(screen, 'Save climb')).toBeUndefined();
  expect(control(screen, 'This week')).toBeDefined();
  await act(async () => screen.unmount());
});

it('after a home test, stays to show the result and offers the next test or Done', async () => {
  const screen = await render(
    setup({ state: { ...emptyGame, onboardingSkipped: true } }),
    'Data',
  );
  await press(
    screen,
    'Do pull-ups',
    'One more, Pull-ups',
    'One more, Pull-ups',
    'Save result',
  );
  expect(text(screen)).toContain('Saved 2 reps');
  expect(text(screen)).toContain('Your first pull-ups result.');
  expect(control(screen, 'Save result')).toBeUndefined();
  await press(screen, 'Next: Dead hang');
  // A fresh test: no note from the last one.
  expect(text(screen)).not.toContain('Saved 2 reps');
  expect(control(screen, 'Done, return to Data')).toBeUndefined();
  await press(screen, 'Back to Data');
  expect(text(screen)).toContain('2 reps, counted today');
  await act(async () => screen.unmount());
});

it('after saving reach, gives the ape index and the next input', async () => {
  const screen = await render(
    setup({ state: { ...emptyGame, onboardingSkipped: true } }),
    'BodyReach',
  );
  const field = (label: string) =>
    screen.root.findAll(n => n.props.accessibilityLabel === label)[0];
  await act(async () => field('Arm span in cm').props.onChangeText('183'));
  await act(async () => field('Height in cm').props.onChangeText('180'));
  await press(screen, 'Save reach');
  expect(text(screen)).toContain('Ape index +3 cm');
  expect(control(screen, 'Next: Dead hang')).toBeDefined();
  await press(screen, 'Done, return to Data');
  expect(control(screen, 'Open body and reach')).toBeDefined();
  await act(async () => screen.unmount());
});

it('shows one readiness state per camera item and opens what can be used', async () => {
  const ready = await render(setup(), 'Data');
  expect(text(ready)).toContain('Ready');
  expect(text(ready)).not.toContain('Needs the server');
  expect(control(ready, 'Open leg spread')).toBeDefined();
  await act(async () => ready.unmount());

  const withheld = await render(setup({ privacy: false }), 'Data');
  expect(text(withheld)).toContain('Needs permission');
  // One switch away, so it still opens and the screen links to Settings.
  expect(control(withheld, 'Open leg spread')).toBeDefined();
  await act(async () => withheld.unmount());

  const offline = await render(setup({ media: false }), 'Data');
  expect(text(offline)).toContain('Needs the server');
  expect(text(offline)).toContain('Coming later');
  expect(control(offline, 'Open leg spread')).toBeUndefined();
  expect(control(offline, 'Open activity and integrations')).toBeUndefined();
  await act(async () => offline.unmount());
});

it('says what flagging a finger did and links to the quest', async () => {
  const screen = await render(
    setup({ state: { ...emptyGame, onboardingSkipped: true } }),
    'Hands',
  );
  await press(screen, 'Left ring finger');
  expect(text(screen)).not.toContain('Left ring finger flagged');
  await press(screen, 'Sore, not sure where, instead of picking spots');
  expect(text(screen)).toContain('Left ring finger flagged');
  expect(text(screen)).toContain('Finger-loading quests wait');
  await press(screen, 'See the quest on your profile');
  expect(text(screen)).toContain('From your logged climbs only');
  await act(async () => screen.unmount());
});
