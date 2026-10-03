/**
 * Every route of the Climbing Monkey API that the app calls, in one place.
 *
 * The server is the FastAPI service in backend/ (routes in
 * backend/src/climbing_monkey/main.py, notes in backend/README.md, live docs
 * at /docs on a running server). Request and answer shapes are in wire.ts.
 * Every route except createClimber needs "Authorization: Bearer <token>".
 */

export type Route = Readonly<{
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
}>;

const id = (value: string) => encodeURIComponent(value);

export const endpoints = {
  /** Body: NewClimberBody. Answer: the climber with its token (sent once). */
  createClimber: (): Route => ({ method: 'POST', path: '/v1/climbers' }),
  /** Body: ClimberUpdateBody. Answer: the climber. */
  updateMe: (): Route => ({ method: 'PATCH', path: '/v1/me' }),

  /** Answer: ClimbDto[], oldest first. */
  listClimbs: (): Route => ({ method: 'GET', path: '/v1/me/climbs' }),
  /** Body: ClimbBody. Answer: the saved ClimbDto with the server's id. */
  addClimb: (): Route => ({ method: 'POST', path: '/v1/me/climbs' }),
  /** Answer: 204, or 404 when it is already gone. */
  removeClimb: (serverId: string): Route => ({
    method: 'DELETE',
    path: `/v1/me/climbs/${id(serverId)}`,
  }),

  /** Answer: HandReportDto[], oldest first. */
  listHandReports: (): Route => ({ method: 'GET', path: '/v1/me/hands' }),
  /** Body: HandReportBody. */
  addHandReport: (): Route => ({ method: 'POST', path: '/v1/me/hands' }),

  /** Answer: AssessmentDto[], oldest first. */
  listAssessments: (): Route => ({ method: 'GET', path: '/v1/me/assessments' }),
  /** Body: AssessmentBody. */
  addAssessment: (): Route => ({ method: 'POST', path: '/v1/me/assessments' }),

  /** Answer: QuestDto[], every quest ever assigned, oldest first. */
  listQuests: (): Route => ({ method: 'GET', path: '/v1/me/quests' }),
  /**
   * Answer: the current QuestDto. The server picks it and answers with the
   * same one on repeat calls while it still fits, so calling it on every
   * load is safe.
   */
  assignQuest: (): Route => ({ method: 'POST', path: '/v1/me/quests' }),
  /** Awards XP once. Answer: 409 when the quest no longer fits. */
  completeQuest: (questId: string): Route => ({
    method: 'POST',
    path: `/v1/me/quests/${id(questId)}/complete`,
  }),
  /** Answer: 409 when the quest was already completed. */
  skipQuest: (questId: string): Route => ({
    method: 'POST',
    path: `/v1/me/quests/${id(questId)}/skip`,
  }),
};
