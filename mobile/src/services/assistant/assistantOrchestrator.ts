import {
  assistantRunRepo,
  assistantSettingRepo,
} from '../../db/repositories';
import type { ChatMessage, ChatSource } from '../ai/chatTypes';
import { aiService } from '../ai/aiService';
import { runtimeDiagnosticsService } from '../runtime/runtimeDiagnosticsService';
import { assistantExecutor } from './assistantExecutor';
import { createAssistantId } from './utils';

export const assistantOrchestrator = {
  handleText: async (
    text: string,
    history: ChatMessage[],
    source: ChatSource
  ): Promise<{
    intent: string;
    reply: string;
    metadata?: Record<string, unknown> | null;
  }> => {
    const autonomyMode = assistantSettingRepo.getAutonomyMode();
    const runtimeSnapshot = runtimeDiagnosticsService.getSnapshot();

    const confirmation = await assistantExecutor.handleConfirmationText(
      text,
      source,
      history
    );
    if (confirmation) {
      return {
        intent: 'assistant.confirmation',
        reply: confirmation.reply,
        metadata: {
          runId: confirmation.runId,
          status: confirmation.status,
          stepResults: confirmation.stepResults,
        },
      };
    }

    const planResult = await aiService.planCommands(text, history);
    if (!planResult.ok) {
      const now = new Date().toISOString();
      const runId = createAssistantId('run');
      const reply =
        planResult.kind === 'planner_parse_error'
          ? 'Planner returned invalid JSON. Command execution was skipped.'
          : 'Planner is unavailable right now. Command execution was skipped.';

      assistantRunRepo.create({
        id: runId,
        source,
        rawText: text,
        summary: 'Planner failed to build a command plan.',
        autonomyMode,
        status: 'failed',
        plannerErrorKind: planResult.kind,
        plannerErrorMessage: planResult.errorMessage,
        plannerRawResponse: planResult.rawResponse,
        plannerNormalizedResponse: planResult.normalizedResponse,
        runtimeSnapshot,
        createdAt: now,
        updatedAt: now,
      });

      return {
        intent: 'assistant.planner_error',
        reply,
        metadata: {
          runId,
          plannerErrorKind: planResult.kind,
          plannerErrorMessage: planResult.errorMessage,
          plannerRawResponse: planResult.rawResponse,
          plannerNormalizedResponse: planResult.normalizedResponse,
          runtimeSnapshot,
        },
      };
    }

    const plan = planResult.plan;
    if (plan.steps.length === 0) {
      const coachHistory = history.length > 0
        ? history
        : [{ role: 'user' as const, content: plan.coachPrompt || text }];
      const coachReply = await aiService.chat(coachHistory);
      return {
        intent: 'coach.chat',
        reply: coachReply,
        metadata: {
          runId: plan.runId,
          plannedSteps: [],
          runtimeSnapshot,
        },
      };
    }

    const execution = await assistantExecutor.executePlan(
      plan,
      text,
      source,
      autonomyMode,
      history,
      {
        runtimeSnapshot,
      }
    );

    return {
      intent: 'assistant.command_plan',
      reply: execution.reply,
      metadata: {
        runId: execution.runId,
        status: execution.status,
        stepResults: execution.stepResults,
        plannedSteps: plan.steps,
        runtimeSnapshot,
      },
    };
  },
};
