import {
  cellTally,
  movementTallies,
  normalizeClimbLog,
  pickFocus,
  terrainTallies,
  type ClimbLog,
  type Movement,
  type Terrain,
} from '../climbing';
import { sampleLogs } from '../sample';

let next = 0;
function climb(terrain: Terrain, sent: boolean, movement: Movement = 'controlled'): ClimbLog {
  next += 1;
  return {
    id: `t${next}`,
    date: '2026-10-01',
    terrain,
    movements: [movement],
    holds: [],
    grade: 'V3',
    sent,
  };
}

describe('profile tallies', () => {
  it('counts sends per terrain in the sample data', () => {
    const t = terrainTallies(sampleLogs);
    expect([t.slab.sent, t.slab.logged]).toEqual([5, 6]);
    expect([t.vertical.sent, t.vertical.logged]).toEqual([2, 6]);
    expect([t.overhang.sent, t.overhang.logged]).toEqual([3, 5]);
  });

  it('reports no rate below three logs instead of a low score', () => {
    const t = terrainTallies([climb('slab', false), climb('slab', false)]);
    expect(t.slab.rate).toBeNull();
    expect(t.vertical).toEqual({ logged: 0, sent: 0, rate: null });
  });

  it('counts a climb with both styles under each style', () => {
    const m = movementTallies(sampleLogs);
    expect([m.controlled.sent, m.controlled.logged]).toEqual([7, 12]);
    expect([m.dynamic.sent, m.dynamic.logged]).toEqual([3, 8]);
    expect(cellTally(sampleLogs, 'vertical', 'dynamic')).toEqual({
      logged: 3,
      sent: 1,
      rate: 1 / 3,
    });
  });

  it('upgrades climbs saved with a single style and no holds', () => {
    const old = { id: 'o1', date: '2026-09-01', terrain: 'slab', movement: 'dynamic', grade: 'V1', sent: true };
    expect(normalizeClimbLog(old)).toEqual({
      id: 'o1',
      date: '2026-09-01',
      terrain: 'slab',
      movements: ['dynamic'],
      holds: [],
      grade: 'V1',
      sent: true,
    });
  });
});

describe('pickFocus', () => {
  it('picks the lowest send rate when every terrain has enough logs', () => {
    expect(pickFocus(sampleLogs)).toMatchObject({
      kind: 'practice',
      terrain: 'vertical',
    });
  });

  it('asks for more logs before calling anything a weakness', () => {
    const logs = [
      climb('slab', true),
      climb('slab', true),
      climb('slab', true),
      climb('vertical', false),
      climb('overhang', false),
      climb('overhang', false),
    ];
    expect(pickFocus(logs)).toMatchObject({ kind: 'explore', terrain: 'vertical' });
  });
});
