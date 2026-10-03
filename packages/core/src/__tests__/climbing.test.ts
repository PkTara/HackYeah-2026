import {
  cellTally,
  movementTallies,
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
  return { id: `t${next}`, date: '2026-10-01', terrain, movement, grade: 'V3', sent };
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

  it('counts movement types and grid cells separately', () => {
    const m = movementTallies(sampleLogs);
    expect(m.controlled.logged + m.dynamic.logged).toBe(sampleLogs.length);
    expect(cellTally(sampleLogs, 'vertical', 'dynamic')).toEqual({
      logged: 2,
      sent: 1,
      rate: null,
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
