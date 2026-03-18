import {
  assistantRunRepo,
  assistantStepRepo,
} from '../../db/repositories';
import type {
  AssistantRunRecord,
  AssistantRunStatus,
  AssistantStepRecord,
  AssistantStepStatus,
} from '../../types';
import { capabilityRegistry } from './capabilityRegistry';
import {
  createAssistantEngine,
  type AssistantEnginePersistence,
} from './assistantEngine';

const persistence: AssistantEnginePersistence = {
  createRun: (run) => {
    assistantRunRepo.create(run as AssistantRunRecord);
  },

  createSteps: (steps) => {
    assistantStepRepo.createMany(steps as AssistantStepRecord[]);
  },

  updateRunStatus: (id, status) => {
    assistantRunRepo.updateStatus(id, status as AssistantRunStatus);
  },

  updateStepResult: (id, status, evidence, error) => {
    assistantStepRepo.updateResult(
      id,
      status as AssistantStepStatus,
      evidence,
      error
    );
  },

  getPendingRun: () => {
    const pending = assistantRunRepo.getPendingConfirmation();
    return pending
      ? {
          ...pending,
          steps: pending.steps as AssistantStepRecord[],
        }
      : null;
  },
};

export const assistantExecutor = createAssistantEngine({
  capabilityProvider: capabilityRegistry,
  persistence,
});
