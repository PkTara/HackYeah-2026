/**
 * Every server endpoint the app calls, in one place.
 *
 * PLACEHOLDER: these paths are our guess at a REST API. When the real API
 * is known, change the paths and methods here (and the payload shapes in
 * wire.ts). Nothing else in the app needs to know.
 */
import type { Finger, Side } from '@hackyeah/core';

export type Route = Readonly<{
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
}>;

const id = (value: string) => encodeURIComponent(value);

export const endpoints = {
  /** Body: none. Answer: ProfileDto. */
  loadProfile: (): Route => ({ method: 'GET', path: '/me/profile' }),

  /** Body: ClimbDto. */
  addClimb: (): Route => ({ method: 'POST', path: '/me/climbs' }),
  removeClimb: (climbId: string): Route => ({
    method: 'DELETE',
    path: `/me/climbs/${id(climbId)}`,
  }),

  completeQuest: (questId: string): Route => ({
    method: 'POST',
    path: `/me/quests/${id(questId)}/complete`,
  }),
  skipQuest: (questId: string): Route => ({
    method: 'POST',
    path: `/me/quests/${id(questId)}/skip`,
  }),

  /** PUT with body HandFlagDto to flag, DELETE to clear. */
  setHandFlag: (side: Side, finger: Finger, flagged: boolean): Route => ({
    method: flagged ? 'PUT' : 'DELETE',
    path: `/me/hand-flags/${side}/${finger}`,
  }),

  /** Body: ReachDto. */
  saveReach: (): Route => ({ method: 'PUT', path: '/me/reach' }),
};
