import {
  createLoopScheduler,
  notesInWindow,
  type ScheduledNote,
} from '../music/scheduler';
import { arrange } from '../music/song';

const arrangement = arrange();
const loop = arrangement.loopSeconds;

/** A clock the test moves by hand, and a timer that ticks when told. */
function fakeClock() {
  let time = 0;
  let ticks: (() => void) | null = null;
  return {
    now: () => time,
    every(tick: () => void) {
      ticks = tick;
      return () => {
        ticks = null;
      };
    },
    advance(seconds: number, step = 0.05) {
      const end = time + seconds;
      while (time < end - 1e-9) {
        time = Math.min(end, time + step);
        ticks?.();
      }
    },
    get ticking() {
      return ticks !== null;
    },
  };
}

function setUp(lookAhead = 0.25) {
  const clock = fakeClock();
  const played: { note: ScheduledNote; when: number; scheduledAt: number }[] = [];
  const scheduler = createLoopScheduler({
    arrangement,
    now: clock.now,
    every: tick => clock.every(tick),
    play: (note, when) => played.push({ note, when, scheduledAt: clock.now() }),
    lookAhead,
  });
  return { clock, played, scheduler };
}

describe('notesInWindow', () => {
  it('returns one pass of the loop for a window of one loop', () => {
    expect(notesInWindow(arrangement, 0, loop)).toHaveLength(
      arrangement.notes.length,
    );
  });

  it('joins windows without gaps or repeats, across the loop seam', () => {
    const whole = notesInWindow(arrangement, 0, loop * 2.5);
    const pieces: ScheduledNote[] = [];
    for (let t = 0; t < loop * 2.5; t += 0.137) {
      pieces.push(...notesInWindow(arrangement, t, Math.min(t + 0.137, loop * 2.5)));
    }
    expect(pieces.map(n => n.at)).toEqual(whole.map(n => n.at));
    expect(whole).toHaveLength(
      arrangement.notes.length * 2 + countBefore(loop * 0.5),
    );
  });

  it('starts the second pass exactly one loop after the first', () => {
    const second = notesInWindow(arrangement, loop, loop * 2);
    expect(second).toHaveLength(arrangement.notes.length);
    second.forEach((note, i) => {
      expect(note.at).toBeCloseTo(arrangement.notes[i].time + loop, 9);
    });
  });

  it('is empty for an empty or backwards window', () => {
    expect(notesInWindow(arrangement, 3, 3)).toEqual([]);
    expect(notesInWindow(arrangement, 4, 3)).toEqual([]);
  });
});

/** Notes of one pass that start before `seconds`. */
function countBefore(seconds: number) {
  return arrangement.notes.filter(n => n.time < seconds).length;
}

describe('createLoopScheduler', () => {
  it('schedules notes a little ahead of the clock, never late', () => {
    const { clock, played, scheduler } = setUp(0.25);
    scheduler.start(0.1);
    clock.advance(10);
    expect(played.length).toBeGreaterThan(0);
    for (const { when, scheduledAt } of played) {
      expect(when).toBeGreaterThanOrEqual(scheduledAt);
      expect(when - scheduledAt).toBeLessThanOrEqual(0.25 + 1e-9);
    }
    // Everything due by 10 s plus the look-ahead, and nothing after it.
    expect(played).toHaveLength(countBefore(10 + 0.25 - 0.1));
  });

  it('plays the first note at the start time', () => {
    const { played, scheduler } = setUp();
    scheduler.start(0.1);
    expect(played[0].when).toBe(0.1);
    expect(played[0].note.at).toBe(0);
  });

  it('stops handing out notes and stops its timer when stopped', () => {
    const { clock, played, scheduler } = setUp();
    scheduler.start(0);
    clock.advance(3);
    scheduler.stop();
    const count = played.length;
    clock.advance(5);
    expect(played).toHaveLength(count);
    expect(scheduler.running).toBe(false);
    expect(clock.ticking).toBe(false);
  });

  it('wraps the loop seamlessly: the second pass repeats the first, one loop later', () => {
    const { clock, played, scheduler } = setUp();
    scheduler.start(0);
    clock.advance(loop * 2 + 1);
    const n = arrangement.notes.length;
    const first = played.slice(0, n);
    const second = played.slice(n, n * 2);
    expect(second).toHaveLength(n);
    second.forEach((entry, i) => {
      expect(entry.note.instrument).toBe(first[i].note.instrument);
      expect(entry.note.pitch).toBe(first[i].note.pitch);
      expect(entry.when - first[i].when).toBeCloseTo(loop, 9);
    });
    // No gap at the seam: the gap between the last note of pass one and the
    // first of pass two is no wider than the widest gap inside the loop.
    const times = played.map(p => p.when);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    const seam = times[n] - times[n - 1];
    expect(seam).toBeLessThanOrEqual(Math.max(...gaps.slice(0, n - 1)) + 1e-9);
  });

  it('skips notes missed during a long stall instead of bursting them out', () => {
    const { clock, played, scheduler } = setUp();
    scheduler.start(0);
    clock.advance(1);
    const before = played.length;
    clock.advance(20, 20); // one tick after 20 s of nothing
    const burst = played.slice(before);
    expect(burst.every(p => p.when >= clock.now() - 1e-9)).toBe(true);
  });

  it('restarts from the top when started again', () => {
    const { clock, played, scheduler } = setUp();
    scheduler.start(0);
    clock.advance(5);
    scheduler.stop();
    played.length = 0;
    scheduler.start(clock.now() + 0.1);
    expect(played[0].note.at).toBe(0);
    expect(played[0].when).toBeCloseTo(5.1, 9);
  });
});
