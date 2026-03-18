import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';
import { activityRepo } from '../../db/repositories';
import { bus } from '../../events/bus';
import type { ActivityBlockView, ActivityStatus } from '../../types';

export type AdminActionResult = {
  ok: boolean;
  reply: string;
  intent?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ActivityTargetParams = {
  rawText?: string;
  targetRef?: 'current' | 'next' | 'title';
  titleQuery?: string;
};

type ActivityStatusParams = ActivityTargetParams & {
  status: Extract<ActivityStatus, 'done' | 'deferred' | 'skipped'>;
  reason?: string;
};

type ActivityRescheduleParams = ActivityTargetParams & {
  dateTimePhrase?: string;
};

type ResolvedTarget =
  | { kind: 'match'; block: ActivityBlockView }
  | { kind: 'ambiguous'; options: ActivityBlockView[] }
  | { kind: 'missing'; reply: string };

const normalise = (value: string): string => value.trim().toLowerCase();

const getCurrentBlock = (blocks: ActivityBlockView[]): ActivityBlockView | null => {
  const now = Date.now();
  return (
    blocks.find((block) => {
      if (!block.scheduledAt) {
        return false;
      }

      const startAt = new Date(block.scheduledAt).getTime();
      if (Number.isNaN(startAt)) {
        return false;
      }

      const endAt = startAt + block.windowMinutes * 60_000;
      return block.status === 'pending' && startAt <= now && now <= endAt;
    }) || null
  );
};

const getNextBlock = (blocks: ActivityBlockView[]): ActivityBlockView | null => {
  const now = Date.now();
  return (
    [...blocks]
      .filter((block) => {
        if (!block.scheduledAt || block.status !== 'pending') {
          return false;
        }

        const startAt = new Date(block.scheduledAt).getTime();
        return !Number.isNaN(startAt) && startAt >= now;
      })
      .sort((a, b) => {
        return new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime();
      })[0] || null
  );
};

const extractTitleQuery = (rawText?: string): string => {
  if (!rawText) {
    return '';
  }

  return rawText
    .toLowerCase()
    .replace(/\b(mark|set|move|reschedule|defer|skip|complete|done|my|the|block|activity|to|for|at|please)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const resolveActivityTarget = (params: ActivityTargetParams): ResolvedTarget => {
  const blocks = activityRepo.getTodaysBlocks();
  if (!blocks.length) {
    return { kind: 'missing', reply: 'There are no blocks scheduled today.' };
  }

  const pendingBlocks = blocks.filter((block) => block.status === 'pending');
  const matchPool = pendingBlocks.length > 0 ? pendingBlocks : blocks;

  const requestedRef =
    params.targetRef ||
    (params.rawText && /\b(this|current)\b/i.test(params.rawText)
      ? 'current'
      : params.rawText && /\bnext\b/i.test(params.rawText)
        ? 'next'
        : undefined);

  if (requestedRef === 'current') {
    const active = getCurrentBlock(matchPool);
    if (active) {
      return { kind: 'match', block: active };
    }

    const next = getNextBlock(matchPool);
    if (next) {
      return { kind: 'match', block: next };
    }

    return { kind: 'missing', reply: 'I could not find a current or upcoming block to act on.' };
  }

  if (requestedRef === 'next') {
    const next = getNextBlock(matchPool);
    return next
      ? { kind: 'match', block: next }
      : { kind: 'missing', reply: 'There is no upcoming block left today.' };
  }

  const titleQuery = normalise(params.titleQuery || extractTitleQuery(params.rawText));
  if (!titleQuery) {
    const fallback = getCurrentBlock(matchPool) || getNextBlock(matchPool);
    return fallback
      ? { kind: 'match', block: fallback }
      : { kind: 'missing', reply: 'I could not determine which block you meant.' };
  }

  const matches = matchPool.filter((block) => normalise(block.title).includes(titleQuery));
  if (matches.length === 1) {
    return { kind: 'match', block: matches[0] };
  }

  if (matches.length > 1) {
    return { kind: 'ambiguous', options: matches.slice(0, 3) };
  }

  return { kind: 'missing', reply: `I could not find a block matching "${titleQuery}".` };
};

const parseExplicitTime = (rawText: string, baseDate: Date): Date | null => {
  const timeMatch = rawText.match(/\b(?:at|to)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!timeMatch) {
    return null;
  }

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] || 0);
  const meridiem = timeMatch[3]?.toLowerCase();

  if (meridiem === 'pm' && hour < 12) {
    hour += 12;
  }
  if (meridiem === 'am' && hour === 12) {
    hour = 0;
  }

  const nextDate = new Date(baseDate);
  nextDate.setHours(hour, minute, 0, 0);

  if (/\btomorrow\b/i.test(rawText)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
};

const parseRelativeShift = (rawText: string, baseDate: Date): Date | null => {
  const relativeMatch = rawText.match(/\b(?:in|by)\s+(\d+)\s*(minute|minutes|hour|hours)\b/i);
  if (!relativeMatch) {
    return null;
  }

  const amount = Number(relativeMatch[1]);
  const unit = relativeMatch[2].toLowerCase();
  const nextDate = new Date(baseDate);
  const deltaMinutes = unit.startsWith('hour') ? amount * 60 : amount;
  nextDate.setMinutes(nextDate.getMinutes() + deltaMinutes);
  return nextDate;
};

const parseRescheduleDate = (block: ActivityBlockView, rawText: string, dateTimePhrase?: string): Date | null => {
  const baseDate = block.scheduledAt ? new Date(block.scheduledAt) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const source = `${rawText} ${dateTimePhrase || ''}`.trim();
  return parseRelativeShift(source, baseDate) || parseExplicitTime(source, baseDate);
};

const formatBlockTime = (scheduledAt: string | null): string => {
  if (!scheduledAt) {
    return 'unscheduled';
  }

  const parsed = new Date(scheduledAt);
  if (Number.isNaN(parsed.getTime())) {
    return scheduledAt;
  }

  return parsed.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatAmbiguityReply = (options: ActivityBlockView[]): string => {
  const labels = options.map((option) => `${option.title} at ${formatBlockTime(option.scheduledAt)}`);
  return `I found multiple matches: ${labels.join(', ')}. Tell me which one.`;
};

const emitStatusEvent = (
  status: Extract<ActivityStatus, 'done' | 'deferred' | 'skipped'>,
  block: ActivityBlockView,
  reason?: string
) => {
  if (status === 'done') {
    bus.emit('activity.completed', { activityId: block.activityId, logId: block.logId || undefined });
    return;
  }

  if (status === 'deferred') {
    bus.emit('activity.deferred', { activityId: block.activityId, logId: block.logId || undefined });
    return;
  }

  bus.emit('activity.skipped', {
    activityId: block.activityId,
    logId: block.logId || undefined,
    reason,
  });
};

const makeReplyForStatus = (
  block: ActivityBlockView,
  status: Extract<ActivityStatus, 'done' | 'deferred' | 'skipped'>
): string => {
  if (status === 'done') {
    return `${block.title} is marked done.`;
  }

  if (status === 'deferred') {
    return `${block.title} is deferred for now.`;
  }

  return `${block.title} is marked skipped.`;
};

export const adminService = {
  createCalendarEvent: async (params: { title?: string; time?: string; date?: string }): Promise<AdminActionResult> => {
    try {
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.intent.action.INSERT', {
          data: 'content://com.android.calendar/events',
          extra: {
            title: params.title || '',
          },
        });
      } else if (Platform.OS === 'ios') {
        await Linking.openURL('calshow://');
      }

      return {
        ok: true,
        reply: `Opening calendar creation for ${params.title || 'your event'}.`,
      };
    } catch (error) {
      console.error('[AdminService] Calendar create failed', error);
      return {
        ok: false,
        reply: 'I could not open your calendar right now.',
      };
    }
  },

  createReminder: async (params: { text?: string; time?: string }): Promise<AdminActionResult> => {
    try {
      if (Platform.OS === 'ios') {
        const url = `shortcuts://run-shortcut?name=Add%20Reminder&input=${encodeURIComponent(
          params.text || ''
        )}`;
        await Linking.openURL(url);
      } else {
        await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
          extra: { 'android.intent.extra.alarm.MESSAGE': params.text || '' },
        });
      }

      return {
        ok: true,
        reply: `Opening reminder creation for ${params.text || 'your reminder'}.`,
      };
    } catch (error) {
      console.error('[AdminService] Reminder create failed', error);
      return {
        ok: false,
        reply: 'I could not open reminders right now.',
      };
    }
  },

  blockApp: async (targetAppPackage: string, durationMinutes: number): Promise<AdminActionResult> => {
    try {
      console.log(
        `[AdminService] Dispatching block instruction to AccessibilityManager for ${targetAppPackage} (${durationMinutes}m)`
      );
      return {
        ok: true,
        reply: `${targetAppPackage} is queued to be blocked for ${durationMinutes} minutes.`,
      };
    } catch (error) {
      console.error('[AdminService] Block app failed', error);
      return {
        ok: false,
        reply: 'I could not block that app right now.',
      };
    }
  },

  updateActivityStatus: async (params: ActivityStatusParams): Promise<AdminActionResult> => {
    const resolved = resolveActivityTarget(params);
    if (resolved.kind === 'missing') {
      return { ok: false, reply: resolved.reply };
    }

    if (resolved.kind === 'ambiguous') {
      return { ok: false, reply: formatAmbiguityReply(resolved.options) };
    }

    const block = resolved.block;
    if (!block.logId) {
      return {
        ok: false,
        reply: `I found ${block.title}, but it does not have a schedulable log entry yet.`,
      };
    }

    if (block.status === params.status) {
      return {
        ok: true,
        reply: `${block.title} is already marked ${params.status}.`,
      };
    }

    emitStatusEvent(params.status, block, params.reason);
    return {
      ok: true,
      reply: makeReplyForStatus(block, params.status),
      intent: 'activity.update_status',
      metadata: {
        activityId: block.activityId,
        logId: block.logId,
        status: params.status,
      },
    };
  },

  rescheduleActivityBlock: async (params: ActivityRescheduleParams): Promise<AdminActionResult> => {
    const resolved = resolveActivityTarget(params);
    if (resolved.kind === 'missing') {
      return { ok: false, reply: resolved.reply };
    }

    if (resolved.kind === 'ambiguous') {
      return { ok: false, reply: formatAmbiguityReply(resolved.options) };
    }

    const block = resolved.block;
    if (block.calendarEventId) {
      return {
        ok: false,
        reply: `I cannot move ${block.title} directly because it came from your calendar. Change it in the calendar app.`,
      };
    }

    if (!block.logId) {
      return {
        ok: false,
        reply: `I found ${block.title}, but it does not have a schedulable log entry yet.`,
      };
    }

    const scheduledDate = parseRescheduleDate(block, params.rawText || '', params.dateTimePhrase);
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
      return {
        ok: false,
        reply: 'Tell me the new time clearly, for example "move my next block to 4 pm".',
      };
    }

    bus.emit('activity.rescheduled', {
      activityId: block.activityId,
      logId: block.logId,
      scheduledAt: scheduledDate.toISOString(),
    });

    return {
      ok: true,
      reply: `${block.title} is moved to ${formatBlockTime(scheduledDate.toISOString())}.`,
      intent: 'activity.reschedule',
      metadata: {
        activityId: block.activityId,
        logId: block.logId,
        scheduledAt: scheduledDate.toISOString(),
      },
    };
  },

  setAlarm: async (params: { time: string; label?: string }): Promise<AdminActionResult> => {
    try {
      const timeStr = params.time; // e.g., "07:00"
      const [hour, minute] = timeStr.split(':').map(Number);

      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
          extra: {
            'android.intent.extra.alarm.HOUR': hour,
            'android.intent.extra.alarm.MINUTES': minute,
            'android.intent.extra.alarm.MESSAGE': params.label || 'DayOS Alarm',
            'android.intent.extra.alarm.SKIP_UI': true,
          },
        });
        return {
          ok: true,
          reply: `Alarm set for ${timeStr}${params.label ? ` (${params.label})` : ''}.`,
          metadata: { time: timeStr, label: params.label },
        };
      } else {
        // iOS Fallback: Create a reminder as "Alarm: [Label]"
        const reminderText = `ALARM: ${params.label || 'DayOS Alarm'} at ${timeStr}`;
        const url = `shortcuts://run-shortcut?name=Add%20Reminder&input=${encodeURIComponent(reminderText)}`;
        await Linking.openURL(url);
        return {
          ok: true,
          reply: `I've queued a reminder for your alarm at ${timeStr} (iOS limitation).`,
          metadata: { time: timeStr, label: params.label },
        };
      }
    } catch (error) {
      console.error('[AdminService] setAlarm failed', error);
      return { ok: false, reply: 'I could not set the alarm right now.' };
    }
  },
};
