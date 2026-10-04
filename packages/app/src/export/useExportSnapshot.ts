/**
 * The one place that picks the mode for Export: the monkey's record from
 * useGame(), or the active sport's from useSport(). Everything after the
 * snapshot is the same for every mode. Nothing is fetched or sent.
 */
import { useMemo } from 'react';
import {
  SPORTS,
  SPORT_IDS,
  buildClimbingSnapshot,
  buildSportSnapshot,
  type ExportSnapshot,
  type OtherSportInput,
  type PeriodWeeks,
} from '@hackyeah/core';
import { useDemo } from '../demo/DemoProvider';
import type { RouteName } from '../navigation/routes';
import { SPORT_VIEWS } from '../sports';
import { useGame } from '../state/GameProvider';
import { useSport } from '../state/SportProvider';
import { climbingWords, sportWords } from './words';

export function useExportSnapshot(weeks: PeriodWeeks): ExportSnapshot {
  const { state: game, today } = useGame();
  const { mode, sport, state, states } = useSport();
  const demo = useDemo().settings.enabled;
  return useMemo(() => {
    const climbing: OtherSportInput = {
      modeName: 'Climbing',
      session: 'climb',
      sessions: 'climbs',
      dates: game.logs.map(log => log.date),
      example: demo || game.logs.some(log => log.sample),
    };
    const sports: OtherSportInput[] = SPORT_IDS.filter(
      id => mode === 'monkey' || id !== sport.id,
    ).map(id => {
      const view = SPORT_VIEWS[id];
      return {
        modeName: view.activity,
        session: view.session,
        sessions: view.sessions,
        dates: states[id].logs.map(log => log.date),
        example: states[id].logs.some(log => log.sample),
      };
    });
    if (mode === 'monkey') {
      return buildClimbingSnapshot(game, climbingWords(), {
        today,
        weeks,
        demoProfile: demo,
        otherSports: sports,
      });
    }
    return buildSportSnapshot(
      SPORTS[sport.id],
      state,
      sportWords(SPORT_VIEWS[sport.id]),
      {
        today,
        weeks,
        // The demo profile covers climbing only; sports keep their own data.
        demoProfile: false,
        otherSports: [climbing, ...sports],
      },
    );
  }, [game, today, mode, sport.id, state, states, demo, weeks]);
}

/** The Export routes for the mode on screen, so their trail and tabs fit. */
export function exportRoutes(mode: string): Readonly<{
  pick: RouteName;
  format: RouteName;
}> {
  return mode === 'monkey'
    ? { pick: 'Export', format: 'ExportFormat' }
    : { pick: 'SportExport', format: 'SportExportFormat' };
}
