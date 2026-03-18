import type { AssistantAutonomyMode, AssistantStepStatus } from '../../types';
import type { CommandStep, StepResult } from './types';

export const createAssistantId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const isAffirmation = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return ['yes', 'y', 'confirm', 'go ahead', 'do it', 'proceed', 'send it'].includes(normalized);
};

export const isCancellation = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return ['no', 'n', 'cancel', 'stop', 'never mind', 'dont', "don't"].includes(normalized);
};

export const shouldRequireConfirmation = (
  step: CommandStep,
  autonomyMode: AssistantAutonomyMode
): boolean => {
  if (step.confirmationPolicy === 'always') {
    return true;
  }

  if (autonomyMode === 'auto_everything') {
    return false;
  }

  return step.confirmationPolicy === 'destructive' || step.confirmationPolicy === 'outbound';
};

export const summarizeStepLabel = (step: Pick<CommandStep, 'namespace' | 'command' | 'humanSummary'>): string => {
  return step.humanSummary || `${step.namespace}.${step.command}`;
};

export const countStatuses = (results: StepResult[]): Record<AssistantStepStatus, number> => {
  return results.reduce<Record<AssistantStepStatus, number>>(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {
      pending: 0,
      verified: 0,
      failed: 0,
      needs_confirmation: 0,
      blocked_by_permission: 0,
      skipped_dependency: 0,
      unverified: 0,
      cancelled: 0,
    }
  );
};

export const buildExecutionReply = (
  summary: string,
  results: StepResult[],
  hasPendingConfirmation: boolean
): string => {
  const counts = countStatuses(results);
  const parts: string[] = [];

  if (counts.verified > 0) {
    parts.push(`${counts.verified} step${counts.verified === 1 ? '' : 's'} verified`);
  }

  if (counts.failed > 0) {
    parts.push(`${counts.failed} failed`);
  }

  if (counts.blocked_by_permission > 0) {
    parts.push(`${counts.blocked_by_permission} blocked by permissions`);
  }

  if (hasPendingConfirmation) {
    const labels = results
      .filter((item) => item.status === 'needs_confirmation')
      .map((item) => item.reply)
      .join('; ');
    return `${summary}\n${parts.join(', ')}.\nConfirmation required: ${labels || 'review pending outbound or destructive steps.'}`;
  }

  return parts.length > 0 ? `${summary}\n${parts.join(', ')}.` : summary;
};
