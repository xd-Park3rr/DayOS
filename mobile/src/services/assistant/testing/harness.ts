import assert from 'node:assert/strict';
import { COMMAND_CATALOG } from '../commandCatalog';
import {
  createAssistantEngine,
  type AssistantEnginePersistence,
  type PendingRunRecord,
  type PersistedRunRecord,
  type PersistedStepRecord,
} from '../assistantEngine';
import type {
  AssistantCapability,
  CapabilityExecutionResult,
  CapabilityReadResult,
  CommandStep,
  PlanExecutionResult,
} from '../types';
import type { AssistantRunStatus, AssistantStepStatus } from '../../../types';
import {
  getScenarioCoverageKeys,
  plannerFixtureCommands,
  plannerFixtures,
  scenarioCatalog,
  type MockStepBehavior,
  type PlannerFixture,
  type ScenarioDefinition,
} from './scenarios';

type ScenarioRunSummary = {
  name: string;
  status: 'passed' | 'failed';
  detail: string;
};

const buildCommandKey = (step: Pick<CommandStep, 'namespace' | 'command'>): string =>
  `${step.namespace}.${step.command}`;

class MemoryPersistence implements AssistantEnginePersistence {
  private runs = new Map<string, PersistedRunRecord>();
  private steps = new Map<string, PersistedStepRecord>();

  createRun(run: PersistedRunRecord): void {
    this.runs.set(run.id, { ...run });
  }

  createSteps(steps: PersistedStepRecord[]): void {
    steps.forEach((step) => {
      this.steps.set(step.id, { ...step });
    });
  }

  updateRunStatus(id: string, status: AssistantRunStatus): void {
    const run = this.runs.get(id);
    if (!run) {
      throw new Error(`Missing run ${id}`);
    }

    this.runs.set(id, {
      ...run,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  updateStepResult(
    id: string,
    status: AssistantStepStatus,
    evidence: Record<string, unknown> | null,
    error: string | null
  ): void {
    const step = this.steps.get(id);
    if (!step) {
      throw new Error(`Missing step ${id}`);
    }

    this.steps.set(id, {
      ...step,
      status,
      evidence,
      error,
      updatedAt: new Date().toISOString(),
    });
  }

  getPendingRun(): PendingRunRecord | null {
    const pending = [...this.runs.values()]
      .filter((run) => run.status === 'awaiting_confirmation')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

    if (!pending) {
      return null;
    }

    return {
      ...pending,
      steps: [...this.steps.values()]
        .filter((step) => step.runId === pending.id)
        .sort((left, right) => left.stepIndex - right.stepIndex),
    };
  }
}

const createDefaultReadContext = (step: CommandStep): CapabilityReadResult => ({
  summary: `Loaded mock context for ${buildCommandKey(step)}`,
  data: {
    command: buildCommandKey(step),
    phase: 'read',
    stepId: step.id,
  },
});

const createDefaultExecuteResult = (step: CommandStep): CapabilityExecutionResult => ({
  reply: `Executed ${buildCommandKey(step)}.`,
  evidence: {
    command: buildCommandKey(step),
    phase: 'execute',
    stepId: step.id,
  },
});

const createDefaultVerifyResult = (
  step: CommandStep,
  execution: CapabilityExecutionResult
): CapabilityExecutionResult => ({
  ...execution,
  reply: `Verified ${buildCommandKey(step)}.`,
  status: 'verified',
  evidence: {
    ...(execution.evidence || {}),
    command: buildCommandKey(step),
    phase: 'verify',
    stepId: step.id,
    verified: true,
  },
});

const resolveBehavior = (
  behaviors: Record<string, MockStepBehavior> | undefined,
  step: CommandStep
): MockStepBehavior => {
  return behaviors?.[step.id] || behaviors?.[buildCommandKey(step)] || {};
};

const createMockCapability = (
  namespace: CommandStep['namespace'],
  behaviors?: Record<string, MockStepBehavior>
): AssistantCapability => ({
  namespace,
  readContext: async (step) => {
    const behavior = resolveBehavior(behaviors, step);
    return behavior.readContext === undefined
      ? createDefaultReadContext(step)
      : behavior.readContext;
  },
  execute: async (step) => {
    const behavior = resolveBehavior(behaviors, step);
    return behavior.execute || createDefaultExecuteResult(step);
  },
  verify: async (step, execution) => {
    const behavior = resolveBehavior(behaviors, step);
    return behavior.verify || createDefaultVerifyResult(step, execution);
  },
});

const createCapabilityProvider = (
  behaviors?: Record<string, MockStepBehavior>
) => {
  const namespaces = ['calendar', 'task', 'activity', 'insight', 'contacts', 'communication', 'app', 'permission'] as const;
  const registry = Object.fromEntries(
    namespaces.map((namespace) => [namespace, createMockCapability(namespace, behaviors)])
  ) as Record<(typeof namespaces)[number], AssistantCapability>;

  return {
    get(namespace: (typeof namespaces)[number]): AssistantCapability {
      return registry[namespace];
    },
  };
};

const assertScenarioResult = (
  scenario: ScenarioDefinition,
  result: PlanExecutionResult
): void => {
  assert.equal(result.status, scenario.expected.finalStatus, `${scenario.name} final status mismatch`);
  assert.equal(
    result.pendingConfirmation,
    scenario.expected.pendingConfirmation,
    `${scenario.name} pending confirmation mismatch`
  );

  Object.entries(scenario.expected.stepStatuses).forEach(([stepId, expectedStatus]) => {
    const actual = result.stepResults.find((step) => step.stepId === stepId);
    assert.ok(actual, `${scenario.name} missing step result for ${stepId}`);
    assert.equal(actual.status, expectedStatus, `${scenario.name} status mismatch for ${stepId}`);
  });
};

const runScenarioInternal = async (
  scenario: ScenarioDefinition
): Promise<PlanExecutionResult> => {
  const persistence = new MemoryPersistence();
  const engine = createAssistantEngine({
    capabilityProvider: createCapabilityProvider(scenario.behaviors),
    persistence,
  });

  let result = await engine.executePlan(
    scenario.plan,
    scenario.rawText,
    'typed',
    scenario.autonomyMode,
    []
  );

  for (const confirmation of scenario.confirmations || []) {
    if (!result.pendingConfirmation) {
      break;
    }

    const resumed = await engine.handleConfirmationText(confirmation, 'typed', []);
    if (!resumed) {
      throw new Error(`Scenario ${scenario.name} expected a pending run for confirmation "${confirmation}"`);
    }
    result = resumed;
  }

  assertScenarioResult(scenario, result);
  return result;
};

export const listScenarioNames = (): string[] =>
  scenarioCatalog.map((scenario) => scenario.name);

export const listPlannerFixtureNames = (): string[] =>
  plannerFixtures.map((fixture) => fixture.name);

export const runScenarioByName = async (name: string): Promise<ScenarioRunSummary> => {
  const scenario = scenarioCatalog.find((item) => item.name === name);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${name}`);
  }

  await runScenarioInternal(scenario);
  return {
    name,
    status: 'passed',
    detail: scenario.description,
  };
};

export const runScenarioSuite = async (): Promise<ScenarioRunSummary[]> => {
  const coveredCommands = getScenarioCoverageKeys();
  const missingCoverage = COMMAND_CATALOG
    .map((spec) => `${spec.namespace}.${spec.command}`)
    .filter((key) => !coveredCommands.has(key));

  assert.equal(
    missingCoverage.length,
    0,
    `Scenario coverage is missing commands: ${missingCoverage.join(', ')}`
  );

  const summaries: ScenarioRunSummary[] = [];
  for (const scenario of scenarioCatalog) {
    await runScenarioInternal(scenario);
    summaries.push({
      name: scenario.name,
      status: 'passed',
      detail: scenario.description,
    });
  }

  return summaries;
};

const assertPlannerFixture = (fixture: PlannerFixture): void => {
  const actualCommands = plannerFixtureCommands(fixture.input);
  assert.deepEqual(
    actualCommands,
    fixture.expectedCommands,
    `${fixture.name} planner mismatch`
  );
};

export const runPlannerFixtureByName = (name: string): ScenarioRunSummary => {
  const fixture = plannerFixtures.find((item) => item.name === name);
  if (!fixture) {
    throw new Error(`Unknown planner fixture: ${name}`);
  }

  assertPlannerFixture(fixture);
  return {
    name,
    status: 'passed',
    detail: fixture.input,
  };
};

export const runPlannerFixtureSuite = (): ScenarioRunSummary[] => {
  return plannerFixtures.map((fixture) => {
    assertPlannerFixture(fixture);
    return {
      name: fixture.name,
      status: 'passed',
      detail: fixture.input,
    };
  });
};

export const formatSuiteSummary = (summaries: ScenarioRunSummary[]): string => {
  const passed = summaries.filter((item) => item.status === 'passed').length;
  return `${passed}/${summaries.length} checks passed.`;
};
