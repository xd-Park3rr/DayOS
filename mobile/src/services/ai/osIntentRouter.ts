import type { ChatMessage } from './chatTypes';
import { adminService } from '../admin/adminService';
import { aiService } from './aiService';

let isInitialized = false;

export type IntentExecutionResult = {
  intent: string;
  params: Record<string, unknown>;
  reply: string;
  metadata?: Record<string, unknown> | null;
};

export const osIntentRouter = {
  initialize: () => {
    if (isInitialized) {
      return;
    }

    isInitialized = true;
    console.log('[Intent Router] Initialized.');
  },

  processText: async (
    text: string,
    history: ChatMessage[]
  ): Promise<IntentExecutionResult> => {
    const parsed = await aiService.parseIntent(text, history);
    if (!parsed) {
      return {
        intent: 'coach.chat',
        params: { prompt: text },
        reply: 'I could not classify that command.',
      };
    }

    console.log(`[Intent Router] Classified Intent: ${parsed.intent}`, parsed.params);
    const result = await osIntentRouter.routeIntent(parsed.intent, parsed.params, history);
    return {
      intent: parsed.intent,
      params: parsed.params || {},
      reply: result.reply,
      metadata: result.metadata || null,
    };
  },

  routeIntent: async (
    intent: string,
    params: any,
    history: ChatMessage[]
  ): Promise<{ reply: string; metadata?: Record<string, unknown> | null }> => {
    try {
      switch (intent) {
        case 'calendar.create': {
          const result = await adminService.createCalendarEvent(params || {});
          return { reply: result.reply, metadata: result.metadata };
        }

        case 'alarm.set': {
          const result = await (adminService as any).setAlarm(params || {});
          return { reply: result.reply, metadata: result.metadata };
        }

        case 'news.query': {
          return { 
            reply: `Searching for the latest news on ${params?.topic || 'general topics'}... [Simulated: AI is seeing a rise in agentic workflows and local-first architectures today.]`,
            metadata: { topic: params?.topic }
          };
        }

        case 'schedule.query':
          return { reply: aiService.getScheduleSummary(params?.date) };

        case 'drift.query':
          return { reply: aiService.getDriftSummary() };

        case 'screentime.block': {
          const result = await adminService.blockApp(params?.targetApp || 'distracting apps', params?.durationMinutes || 60);
          return { reply: result.reply, metadata: result.metadata };
        }

        case 'reminder.create': {
          const result = await adminService.createReminder(params || {});
          return { reply: result.reply, metadata: result.metadata };
        }

        case 'activity.checkin':
          return {
            reply: `Checking you in to ${params?.targetActivity || 'your current block'}. Stay focused.`,
          };

        case 'activity.update_status': {
          const result = await adminService.updateActivityStatus(params);
          return { reply: result.reply, metadata: result.metadata };
        }

        case 'activity.reschedule': {
          const result = await adminService.rescheduleActivityBlock(params);
          return { reply: result.reply, metadata: result.metadata };
        }

        case 'coach.chat':
          return {
            reply: await aiService.chat(history),
          };

        default:
          return { reply: 'I did not understand that command.' };
      }
    } catch (error) {
      console.error('[Intent Router] Execution error:', error);
      return { reply: 'Something went wrong processing your request.' };
    }
  },
};
