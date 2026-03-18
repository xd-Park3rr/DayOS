import type {
  AssistantAutonomyMode,
  AssistantRunStatus,
  AssistantStepStatus,
} from '../../../types';
import {
  COMMAND_CATALOG,
  type CommandSpec,
  withCommandDefaults,
} from '../commandCatalog';
import { localCommandPlanner } from '../localPlanner';
import type {
  CapabilityExecutionResult,
  CapabilityReadResult,
  CommandPlan,
  CommandStep,
} from '../types';

export type MockStepBehavior = {
  readContext?: CapabilityReadResult | null;
  execute?: CapabilityExecutionResult;
  verify?: CapabilityExecutionResult;
};

export type ScenarioDefinition = {
  name: string;
  description: string;
  rawText: string;
  plan: CommandPlan;
  autonomyMode: AssistantAutonomyMode;
  confirmations?: string[];
  behaviors?: Record<string, MockStepBehavior>;
  expected: {
    finalStatus: AssistantRunStatus;
    pendingConfirmation: boolean;
    stepStatuses: Record<string, AssistantStepStatus>;
  };
};

export type PlannerFixture = {
  name: string;
  input: string;
  expectedCommands: string[];
};

const sanitize = (value: string): string =>
  value.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();

const commandKey = (namespace: string, command: string): string => `${namespace}.${command}`;

const buildStep = (
  id: string,
  namespace: CommandStep['namespace'],
  command: string,
  params: Record<string, unknown> = {},
  dependsOn: string[] = []
): CommandStep => {
  const step = withCommandDefaults({
    id,
    namespace,
    command,
    humanSummary: `${namespace}.${command}`,
    params,
    dependsOn,
  });

  if (!step) {
    throw new Error(`Unsupported command in test harness: ${namespace}.${command}`);
  }

  return step;
};

const buildPlan = (runId: string, summary: string, steps: CommandStep[]): CommandPlan => ({
  runId,
  summary,
  steps,
});

const defaultParamsFor = (spec: CommandSpec): Record<string, unknown> => {
  const key = commandKey(spec.namespace, spec.command);
  switch (key) {
    case 'calendar.query_range':
      return { startAt: '2026-03-18T08:00:00.000Z', endAt: '2026-03-18T18:00:00.000Z' };
    case 'calendar.get_event':
      return { eventId: 'evt-123' };
    case 'calendar.find_free_slots':
      return {
        startAt: '2026-03-18T08:00:00.000Z',
        endAt: '2026-03-18T18:00:00.000Z',
        durationMinutes: 60,
      };
    case 'calendar.create_event':
      return {
        title: 'Mock meeting',
        startAt: '2026-03-18T09:00:00.000Z',
        endAt: '2026-03-18T10:00:00.000Z',
      };
    case 'calendar.update_event':
      return {
        eventId: 'evt-123',
        patch: { startAt: '2026-03-18T11:00:00.000Z' },
      };
    case 'calendar.delete_event':
      return { eventId: 'evt-123' };
    case 'task.query':
      return { status: 'pending' };
    case 'task.create':
      return { title: 'Mock task', dueAt: '2026-03-18T12:00:00.000Z' };
    case 'task.update':
      return { taskId: 'task-123', patch: { title: 'Updated task' } };
    case 'task.complete':
      return { taskId: 'task-123' };
    case 'task.snooze':
      return { taskId: 'task-123', dueAt: '2026-03-18T13:00:00.000Z' };
    case 'task.delete':
      return { taskId: 'task-123' };
    case 'activity.checkin':
      return { targetRef: 'current', titleQuery: 'Workout' };
    case 'activity.mark_done':
    case 'activity.mark_deferred':
    case 'activity.mark_skipped':
      return { targetRef: 'current', titleQuery: 'Workout' };
    case 'activity.reschedule':
      return { targetRef: 'current', titleQuery: 'Workout', dateTimePhrase: 'today 6 pm' };
    case 'insight.schedule_query':
      return { date: 'today' };
    case 'contacts.search':
      return { query: 'John' };
    case 'contacts.get_contact':
      return { contactId: 'contact-123' };
    case 'communication.sms.draft':
      return { contactQuery: 'John', body: 'Running late.' };
    case 'communication.call.dial':
      return { contactQuery: 'John' };
    case 'app.search':
    case 'app.launch':
    case 'app.open_settings':
    case 'app.block':
    case 'app.unblock':
      return { appQuery: 'instagram', packageName: 'com.instagram.android' };
    case 'app.usage_query':
      return { packageName: 'com.instagram.android', startAt: '2026-03-18T00:00:00.000Z' };
    case 'permission.open_settings':
      return { target: 'usage_access' };
    default:
      return {};
  }
};

const commandSmokeScenarios: ScenarioDefinition[] = COMMAND_CATALOG.map((spec) => {
  const scenarioId = sanitize(commandKey(spec.namespace, spec.command));
  const stepId = `step-${scenarioId}`;
  return {
    name: `smoke.${scenarioId}`,
    description: `Smoke test ${spec.namespace}.${spec.command}`,
    rawText: `Smoke test ${spec.namespace}.${spec.command}`,
    plan: buildPlan(
      `run-${scenarioId}`,
      `Smoke test ${spec.namespace}.${spec.command}`,
      [buildStep(stepId, spec.namespace, spec.command, defaultParamsFor(spec))]
    ),
    autonomyMode: spec.confirmationPolicy === 'auto' ? 'safe_auto' : 'auto_everything',
    expected: {
      finalStatus: 'completed',
      pendingConfirmation: false,
      stepStatuses: {
        [stepId]: 'verified',
      },
    },
  };
});

const confirmationStep = buildStep(
  'step-confirm-delete',
  'calendar',
  'delete_event',
  { eventId: 'evt-confirm' }
);

const confirmationFollowUp = buildStep(
  'step-confirm-message',
  'communication',
  'sms.draft',
  { contactQuery: 'John', body: 'I moved the meeting.' },
  ['step-confirm-delete']
);

const dependencyFailureStep = buildStep(
  'step-fail-update',
  'task',
  'update',
  { taskId: 'task-fail', patch: { title: 'Will fail' } }
);

const dependencySkippedStep = buildStep(
  'step-skip-call',
  'communication',
  'call.dial',
  { contactQuery: 'Sarah' },
  ['step-fail-update']
);

const partialSuccessStep = buildStep(
  'step-task-create',
  'task',
  'create',
  { title: 'Deep work', dueAt: '2026-03-18T14:00:00.000Z' }
);

const partialBlockedStep = buildStep(
  'step-app-launch',
  'app',
  'launch',
  { appQuery: 'instagram', packageName: 'com.instagram.android' }
);

const flowScenarios: ScenarioDefinition[] = [
  {
    name: 'flow.awaiting-confirmation',
    description: 'Safe auto should pause destructive commands for confirmation.',
    rawText: 'Delete the event.',
    plan: buildPlan('run-awaiting-confirmation', 'Awaiting confirmation flow', [confirmationStep]),
    autonomyMode: 'safe_auto',
    expected: {
      finalStatus: 'awaiting_confirmation',
      pendingConfirmation: true,
      stepStatuses: {
        [confirmationStep.id]: 'needs_confirmation',
      },
    },
  },
  {
    name: 'flow.confirmation-continue',
    description: 'Confirmed steps should resume and verify.',
    rawText: 'Delete the event and text John.',
    plan: buildPlan(
      'run-confirmation-continue',
      'Confirmed flow',
      [confirmationStep, confirmationFollowUp]
    ),
    autonomyMode: 'safe_auto',
    confirmations: ['confirm'],
    expected: {
      finalStatus: 'completed',
      pendingConfirmation: false,
      stepStatuses: {
        [confirmationStep.id]: 'verified',
        [confirmationFollowUp.id]: 'verified',
      },
    },
  },
  {
    name: 'flow.confirmation-cancel',
    description: 'Cancelling a pending step should mark the run cancelled.',
    rawText: 'Delete the event.',
    plan: buildPlan('run-confirmation-cancel', 'Cancel flow', [confirmationStep]),
    autonomyMode: 'safe_auto',
    confirmations: ['cancel'],
    expected: {
      finalStatus: 'cancelled',
      pendingConfirmation: false,
      stepStatuses: {
        [confirmationStep.id]: 'cancelled',
      },
    },
  },
  {
    name: 'flow.dependency-skip',
    description: 'Dependent steps should skip when an upstream step fails.',
    rawText: 'Update the task and then call Sarah.',
    plan: buildPlan(
      'run-dependency-skip',
      'Dependency skip flow',
      [dependencyFailureStep, dependencySkippedStep]
    ),
    autonomyMode: 'safe_auto',
    behaviors: {
      [dependencyFailureStep.id]: {
        execute: {
          reply: 'Task update failed.',
          status: 'failed',
          error: 'Mocked task update failure.',
        },
      },
    },
    expected: {
      finalStatus: 'failed',
      pendingConfirmation: false,
      stepStatuses: {
        [dependencyFailureStep.id]: 'failed',
        [dependencySkippedStep.id]: 'skipped_dependency',
      },
    },
  },
  {
    name: 'flow.partial-independent',
    description: 'Independent steps should continue when one is blocked.',
    rawText: 'Create a task and launch Instagram.',
    plan: buildPlan(
      'run-partial-independent',
      'Partial independent flow',
      [partialSuccessStep, partialBlockedStep]
    ),
    autonomyMode: 'safe_auto',
    behaviors: {
      [partialBlockedStep.id]: {
        execute: {
          reply: 'Usage access is missing.',
          status: 'blocked_by_permission',
          error: 'Mocked missing usage access.',
        },
      },
    },
    expected: {
      finalStatus: 'partial',
      pendingConfirmation: false,
      stepStatuses: {
        [partialSuccessStep.id]: 'verified',
        [partialBlockedStep.id]: 'blocked_by_permission',
      },
    },
  },
];

export const scenarioCatalog: ScenarioDefinition[] = [
  ...commandSmokeScenarios,
  ...flowScenarios,
];

export const plannerFixtures: PlannerFixture[] = [
  {
    name: 'planner.multi-request-calendar-and-message',
    input: "move my 3pm meeting and text John I'm late",
    expectedCommands: ['calendar.update_event', 'communication.sms.draft'],
  },
  {
    name: 'planner.block-and-reminder',
    input: 'block instagram for 2 hours and remind me to stretch at 5 pm',
    expectedCommands: ['app.block', 'task.create'],
  },
  {
    name: 'planner.activity-and-schedule',
    input: 'mark current block done and show my schedule',
    expectedCommands: ['activity.mark_done', 'insight.schedule_query'],
  },
  {
    name: 'planner.setup-and-launch',
    input: 'check setup and open instagram',
    expectedCommands: ['permission.setup_check', 'app.launch'],
  },
  {
    name: 'planner.call-contact',
    input: 'call Sarah',
    expectedCommands: ['communication.call.dial'],
  },
];

export const getScenarioCoverageKeys = (): Set<string> => {
  const coverage = new Set<string>();
  scenarioCatalog.forEach((scenario) => {
    scenario.plan.steps.forEach((step) => {
      coverage.add(commandKey(step.namespace, step.command));
    });
  });
  return coverage;
};

export const plannerFixtureCommands = (
  input: string
): string[] => {
  return localCommandPlanner
    .buildPlan(input)
    .steps
    .map((step) => commandKey(step.namespace, step.command));
};
