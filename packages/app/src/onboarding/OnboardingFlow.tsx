import { useState, type ReactNode } from 'react';
import {
  BASELINE_TESTS,
  baselineTest,
  bodyCmError,
  buildOnboardingResult,
  connectionsFor,
  emptyOnboardingDraft,
  parseWholeNumber,
  toLocalDate,
  type BaselineTestId,
  type ClimbPlace,
  type ConnectionChoice,
  type ConnectionId,
  type OnboardingDraft,
  type OnboardingResult,
  type ResultMethod,
} from '@hackyeah/core';
import { useCapabilities } from '../capabilities';
import {
  BodyStep,
  ExperienceStep,
  GoalStep,
  GradeStep,
  PlacesStep,
  WelcomeStep,
  type BodyText,
} from './AboutSteps';
import { AppsStep, ConsentStep } from './AppsStep';
import {
  consentApp,
  consentStep,
  currentStep,
  goBack,
  goTo,
  isTestStep,
  lineFor,
  nextStep,
  startNav,
  type StepId,
} from './flow';
import { StepFrame, type FooterAction } from './StepFrame';
import { DoneStep, TestStep, TestsIntroStep } from './TestSteps';
import { PrivacyPanel } from '../privacy/PrivacyPanel';

type Props = {
  /** Called once with everything the climber entered. */
  onFinish: (result: OnboardingResult) => void;
  /** "Skip setup" on the first screen: go straight to the app. */
  onSkip: () => void;
  /** Local date for the results, YYYY-MM-DD. Defaults to today. */
  today?: string;
};

const EMPTY_BODY: BodyText = { height: '', arm: '' };

/**
 * First-run onboarding, one small step at a time, led by the monkey.
 * It keeps its answers to itself and hands them over through onFinish; it
 * never touches the game state.
 */
export function OnboardingFlow({ onFinish, onSkip, today }: Props) {
  const { platform } = useCapabilities();
  const [nav, setNav] = useState(startNav);
  const [draft, setDraft] = useState<OnboardingDraft>(emptyOnboardingDraft);
  const [bodyText, setBodyText] = useState<BodyText>(EMPTY_BODY);
  const [bodyTried, setBodyTried] = useState(false);

  const step = currentStep(nav);
  const go = (to: StepId) => setNav(n => goTo(n, to));
  const forward = () => go(nextStep(step));
  const back = () => setNav(goBack);
  const update = (patch: Partial<OnboardingDraft>) =>
    setDraft(d => ({ ...d, ...patch }));

  const choose = (id: ConnectionId, choice: ConnectionChoice | null) =>
    setDraft(d => {
      const connections = { ...d.connections };
      if (choice) {
        connections[id] = choice;
      } else {
        delete connections[id];
      }
      return { ...d, connections };
    });

  /** A test's result, or null to clear it. */
  const setResult = (
    id: BaselineTestId,
    entry: Readonly<{ value: number; method: ResultMethod }> | null,
  ) =>
    setDraft(d => {
      const results = { ...d.results };
      if (entry) {
        results[id] = entry;
      } else {
        delete results[id];
      }
      return { ...d, results };
    });

  /** Next on a required question. */
  const required = (answered: boolean, what: string): FooterAction => ({
    label: 'Next',
    onPress: forward,
    disabled: !answered,
    hint: answered ? undefined : `Pick ${what} first`,
  });

  const frame = (
    content: ReactNode,
    footer: Readonly<{
      back?: boolean;
      skip?: FooterAction;
      next?: FooterAction;
    }>,
  ) => (
    // A new frame per step: the page starts at the top and the monkey hops
    // over from the step before.
    <StepFrame
      key={step}
      step={step}
      from={nav.from}
      line={lineFor(step)}
      back={footer.back === false ? undefined : back}
      skip={footer.skip}
      next={footer.next}
      onStart={() => setNav(startNav)}
      onApps={() => go('apps')}
      onTests={() => go('tests')}
    >
      {content}
    </StepFrame>
  );

  const app = consentApp(step);
  if (app) {
    return frame(
      <ConsentStep
        id={app}
        onChoose={choice => {
          choose(app, choice);
          back();
        }}
      />,
      {},
    );
  }

  if (isTestStep(step)) {
    const test = baselineTest(step);
    const result = draft.results[step];
    const timed = test.input === 'stopwatch';
    return frame(
      <TestStep
        test={test}
        index={BASELINE_TESTS.indexOf(test) + 1}
        result={result}
        onResult={(value, method) =>
          setResult(step, value === null ? null : { value, method })
        }
      />,
      {
        skip: {
          label: 'Skip',
          accessibilityLabel: 'Skip this one',
          onPress: () => {
            setResult(step, null);
            forward();
          },
        },
        // Next needs a result; without one, Skip says so honestly.
        next: {
          label: 'Next',
          disabled: !result,
          hint: result
            ? undefined
            : timed
            ? 'Time it or type your time in first'
            : 'Count it or type it in first',
          onPress: forward,
        },
      },
    );
  }

  switch (step) {
    case 'welcome':
      return frame(
        <>
          <WelcomeStep />
          <PrivacyPanel />
        </>,
        {
          back: false,
          skip: {
            label: 'Skip setup',
            onPress: onSkip,
            hint: 'Goes straight to the app',
          },
          next: { label: 'Start', onPress: forward },
        },
      );

    case 'places':
      return frame(
        <PlacesStep
          places={draft.places}
          onToggle={(place: ClimbPlace) =>
            update({
              places: draft.places.includes(place)
                ? draft.places.filter(p => p !== place)
                : [...draft.places, place],
            })
          }
        />,
        { next: required(draft.places.length > 0, 'where you climb') },
      );

    case 'experience':
      return frame(
        <ExperienceStep
          value={draft.experience}
          onPick={experience => update({ experience })}
        />,
        {
          next: required(
            draft.experience !== null,
            'how long you have climbed',
          ),
        },
      );

    case 'grade':
      return frame(
        <GradeStep value={draft.grade} onPick={grade => update({ grade })} />,
        { next: required(draft.grade !== null, 'a grade') },
      );

    case 'goal':
      return frame(
        <GoalStep value={draft.goal} onPick={goal => update({ goal })} />,
        { next: required(draft.goal !== null, 'a goal') },
      );

    case 'body': {
      const saveBody = () => {
        if (bodyText.height.trim() === '' && bodyText.arm.trim() === '') {
          update({ body: null });
          forward();
          return;
        }
        const heightCm = parseWholeNumber(bodyText.height);
        const armSpanCm = parseWholeNumber(bodyText.arm);
        if (
          bodyCmError(bodyText.height) ||
          bodyCmError(bodyText.arm) ||
          heightCm === null ||
          armSpanCm === null
        ) {
          setBodyTried(true);
          return;
        }
        update({ body: { heightCm, armSpanCm } });
        forward();
      };
      return frame(
        <BodyStep
          text={bodyText}
          errors={{
            height: bodyTried ? bodyCmError(bodyText.height) : null,
            arm: bodyTried ? bodyCmError(bodyText.arm) : null,
          }}
          onChange={setBodyText}
          onSubmit={saveBody}
        />,
        {
          skip: {
            label: 'Skip',
            accessibilityLabel: 'Skip reach',
            onPress: () => {
              update({ body: null });
              setBodyText(EMPTY_BODY);
              setBodyTried(false);
              forward();
            },
          },
          next: { label: 'Next', onPress: saveBody },
        },
      );
    }

    case 'apps':
      return frame(
        <AppsStep
          apps={connectionsFor(platform)}
          choices={draft.connections}
          onAsk={id => go(consentStep(id))}
          onChoose={choose}
        />,
        {
          skip: {
            label: 'Skip',
            accessibilityLabel: 'Skip apps',
            onPress: () => {
              update({ connections: {} });
              forward();
            },
          },
          next: { label: 'Next', onPress: forward },
        },
      );

    case 'tests':
      return frame(
        <TestsIntroStep onStart={forward} onSkip={() => go('done')} />,
        {},
      );

    case 'done': {
      const result = buildOnboardingResult(
        draft,
        today ?? toLocalDate(new Date()),
      );
      return frame(<DoneStep result={result} />, {
        next: {
          label: 'Go to my profile',
          disabled: !result,
          onPress: () => {
            if (result) {
              onFinish(result);
            }
          },
        },
      });
    }

    default:
      return null;
  }
}
