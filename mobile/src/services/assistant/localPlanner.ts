import { withCommandDefaults } from './commandCatalog';
import type { CommandPlan, CommandStep } from './types';
import { createAssistantId } from './utils';

type PlannedStepInput = {
  namespace: CommandStep['namespace'];
  command: string;
  humanSummary?: string;
  params?: Record<string, unknown>;
  dependsOn?: string[];
};

const isSchedulePrompt = (lower: string): boolean =>
  lower.includes('schedule') ||
  lower.includes('agenda') ||
  lower.includes("what's on") ||
  lower.includes('what is on') ||
  lower.includes('plan for today');

const isDriftPrompt = (lower: string): boolean =>
  lower.includes('drift') ||
  lower.includes('momentum') ||
  lower.includes('training this week') ||
  lower.includes('consistency');

const extractDurationMinutes = (lower: string): number => {
  const hourMatch = lower.match(/(\d+)\s*hour/);
  if (hourMatch) {
    return Number(hourMatch[1]) * 60;
  }

  const minuteMatch = lower.match(/(\d+)\s*minute/);
  if (minuteMatch) {
    return Number(minuteMatch[1]);
  }

  return 60;
};

const extractTimePhrase = (raw: string): string | undefined => {
  const match = raw.match(/\b(?:at|for)\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?|\btomorrow\b|\btoday\b)/i);
  return match?.[1]?.trim();
};

const extractReminderText = (raw: string): string => {
  const cleaned = raw
    .replace(/^remind me to\s+/i, '')
    .replace(/^set a reminder to\s+/i, '')
    .replace(/\s+at\s+.+$/i, '')
    .trim();

  return cleaned || 'do this';
};

const extractCalendarTitle = (raw: string): string => {
  const cleaned = raw
    .replace(/^(add|create|schedule|put)\s+/i, '')
    .replace(/\s+(?:on|for|at)\s+.+$/i, '')
    .replace(/\s+to my calendar$/i, '')
    .trim();

  return cleaned || 'New event';
};

const extractActivityTarget = (raw: string): string => {
  const match = raw.match(/\b(?:heading to|going to|at|into)\s+(.+)$/i);
  return match?.[1]?.trim() || 'your next block';
};

const detectActivityTargetRef = (lower: string): 'current' | 'next' | 'title' => {
  if (/\b(this|current)\b/.test(lower)) {
    return 'current';
  }

  if (/\bnext\b/.test(lower)) {
    return 'next';
  }

  return 'title';
};

const extractActivityTitleQuery = (raw: string): string => {
  return raw
    .replace(/\b(mark|set|move|reschedule|defer|skip|complete|done|my|the|block|activity|to|for|at|please|by|in)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractReschedulePhrase = (raw: string): string | undefined => {
  const match = raw.match(/\b(?:to|at|in|by)\s+(.+)$/i);
  return match?.[1]?.trim();
};

const detectStatusIntent = (
  lower: string
): 'done' | 'deferred' | 'skipped' | null => {
  if (/\b(done|complete|completed|finish|finished|mark .* done)\b/.test(lower)) {
    return 'done';
  }

  if (/\b(defer|deferred|delay|postpone)\b/.test(lower)) {
    return 'deferred';
  }

  if (/\b(skip|skipped|cancel)\b/.test(lower)) {
    return 'skipped';
  }

  return null;
};

const splitUserRequest = (input: string): string[] => {
  return input
    .split(/\b(?:and then|then|also)\b|,\s+|\s+\band\b\s+(?=(?:text|call|open|launch|block|create|add|schedule|move|delete|remove|complete|check|show|what|find|set|remind)\b)|[.;]/i)
    .map((part) => part.trim())
    .filter(Boolean);
};

const extractContactQuery = (raw: string): string | undefined => {
  const match = raw.match(/\b(?:text|sms|message|call)\s+([a-z][a-z\s'-]+)/i);
  return match?.[1]?.trim();
};

const extractContactSearchQuery = (raw: string): string | undefined => {
  const match = raw.match(/\b(?:search|find|look up|lookup)\s+(?:for\s+)?([a-z][a-z\s'-]+?)(?:\s+in\s+contacts?)?$/i);
  return match?.[1]?.trim();
};

const extractMessageBody = (raw: string): string | undefined => {
  const match = raw.match(/\b(?:that|saying|message)\s+(.+)$/i);
  return match?.[1]?.trim();
};

const extractAppQuery = (raw: string): string | undefined => {
  const lower = raw.toLowerCase();
  const knownApps = ['instagram', 'youtube', 'tiktok', 'reddit', 'spotify', 'whatsapp', 'gmail', 'chrome', 'maps'];
  return knownApps.find((app) => lower.includes(app));
};

const buildLocalStep = (
  rawInput: string,
  runId: string,
  index: number
): CommandStep | null => {
  const raw = rawInput.trim();
  const lower = raw.toLowerCase();

  const addStep = (
    namespace: CommandStep['namespace'],
    command: string,
    humanSummary: string,
    params: Record<string, unknown>
  ): CommandStep | null =>
    withCommandDefaults({
      id: `${runId}-step-${index + 1}`,
      namespace,
      command,
      humanSummary,
      params,
      dependsOn: [],
    });

  if (isSchedulePrompt(lower)) {
    return addStep('insight', 'schedule_query', 'Check your schedule', {
      date: lower.includes('tomorrow') ? 'tomorrow' : 'today',
    });
  }

  if (isDriftPrompt(lower)) {
    return addStep('insight', 'drift_query', 'Check your drift summary', {});
  }

  if (lower.includes('sleep')) {
    return addStep('insight', 'sleep_query', 'Check your sleep data', {});
  }

  const statusIntent = detectStatusIntent(lower);
  if (statusIntent) {
    const command =
      statusIntent === 'done'
        ? 'mark_done'
        : statusIntent === 'deferred'
          ? 'mark_deferred'
          : 'mark_skipped';
    return addStep('activity', command, `Update ${extractActivityTitleQuery(raw) || 'current block'}`, {
      status: statusIntent,
      targetRef: detectActivityTargetRef(lower),
      titleQuery: extractActivityTitleQuery(raw),
      rawText: raw,
    });
  }

  if (/\b(move|reschedule|shift)\b/.test(lower) && /\b(block|activity)\b/.test(lower)) {
    return addStep('activity', 'reschedule', 'Reschedule a DayOS block', {
      targetRef: detectActivityTargetRef(lower),
      titleQuery: extractActivityTitleQuery(raw),
      rawText: raw,
      dateTimePhrase: extractReschedulePhrase(raw),
    });
  }

  if (lower.startsWith('remind me') || lower.includes('task') || lower.includes('todo')) {
    return addStep('task', 'create', 'Create a task', {
      title: extractReminderText(raw),
      dueAt: extractTimePhrase(raw),
      notes: lower.includes('about ') ? raw.split(/about /i)[1] : undefined,
    });
  }

  if (/\bcomplete\b/.test(lower) && /\btask\b/.test(lower)) {
    return addStep('task', 'complete', 'Complete a task', {
      titleQuery: extractReminderText(raw),
    });
  }

  if (/\b(delete|remove)\b/.test(lower) && /\btask\b/.test(lower)) {
    return addStep('task', 'delete', 'Delete a task', {
      titleQuery: extractReminderText(raw),
    });
  }

  if (
    /\b(add|create|schedule|put)\b/.test(lower) &&
    (lower.includes('calendar') || lower.includes('event') || lower.includes('meeting'))
  ) {
    return addStep('calendar', 'create_event', 'Create a calendar event', {
      title: extractCalendarTitle(raw),
      startAt: extractTimePhrase(raw),
      durationMinutes: extractDurationMinutes(lower),
    });
  }

  if ((lower.includes('contact') || lower.includes('contacts')) && /\b(search|find|look up|lookup)\b/.test(lower)) {
    return addStep('contacts', 'search', 'Search contacts', {
      query: extractContactSearchQuery(raw),
      rawText: raw,
    });
  }

  if (/\b(move|reschedule)\b/.test(lower) && /\b(meeting|event|calendar)\b/.test(lower)) {
    return addStep('calendar', 'update_event', 'Move a calendar event', {
      titleQuery: extractCalendarTitle(raw),
      startAt: extractReschedulePhrase(raw),
      patch: {
        startAt: extractReschedulePhrase(raw),
      },
    });
  }

  if (/\b(delete|remove|cancel)\b/.test(lower) && /\b(meeting|event|calendar)\b/.test(lower)) {
    return addStep('calendar', 'delete_event', 'Delete a calendar event', {
      titleQuery: extractCalendarTitle(raw),
    });
  }

  if (lower.startsWith('text ') || lower.startsWith('sms ') || lower.startsWith('message ')) {
    return addStep('communication', 'sms.draft', 'Draft an SMS', {
      contactQuery: extractContactQuery(raw),
      body: extractMessageBody(raw) || raw,
    });
  }

  if (lower.startsWith('call ')) {
    return addStep('communication', 'call.dial', 'Open the dialer', {
      contactQuery: extractContactQuery(raw),
    });
  }

  if (/\b(block|lock|stop)\b/.test(lower) && !!extractAppQuery(raw)) {
    return addStep('app', 'block', 'Save an app block rule', {
      appQuery: extractAppQuery(raw),
      durationMinutes: extractDurationMinutes(lower),
      reason: raw,
    });
  }

  if ((/\b(open|launch)\b/.test(lower) && !!extractAppQuery(raw)) || lower.startsWith('start ')) {
    return addStep('app', 'launch', 'Launch an app', {
      appQuery: extractAppQuery(raw) || raw.replace(/^(open|launch|start)\s+/i, '').trim(),
    });
  }

  if (lower.includes('permission') || lower.includes('setup')) {
    return addStep('permission', 'setup_check', 'Check Android permissions', {});
  }

  if (
    lower.includes('heading to') ||
    lower.includes('going to') ||
    lower.includes('check me in')
  ) {
    return addStep('activity', 'checkin', 'Check in to a DayOS block', {
      targetActivity: extractActivityTarget(raw),
      titleQuery: extractActivityTarget(raw),
    });
  }

  return null;
};

const normalizePlannedSteps = (
  steps: PlannedStepInput[],
  runId: string
): CommandStep[] => {
  return steps
    .map((step, index) =>
      withCommandDefaults({
        id: `${runId}-step-${index + 1}`,
        namespace: step.namespace,
        command: step.command,
        humanSummary: step.humanSummary?.trim() || `${step.namespace}.${step.command}`,
        params: step.params || {},
        dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn : [],
      })
    )
    .filter((step): step is CommandStep => !!step);
};

const buildPlan = (input: string): CommandPlan => {
  const runId = createAssistantId('run');
  const steps = splitUserRequest(input)
    .map((part, index) => buildLocalStep(part, runId, index))
    .filter((step): step is CommandStep => !!step);

  return {
    runId,
    summary: steps.length > 0 ? 'Working on your request.' : 'No device commands were planned.',
    coachPrompt: steps.length > 0 ? null : input,
    steps,
  };
};

export const localCommandPlanner = {
  buildPlan,
  normalizePlannedSteps,
};
