export type SubscriptionMap = {
  'schedule.updated': undefined;
  'usage.threshold': { categoryId: string };
  'usage.exceeded': { categoryId: string };
  'reminder.due': { activityId: string };
  'activity.completed': { activityId: string; logId?: string };
  'activity.skipped': { activityId: string; logId?: string; reason?: string };
  'activity.deferred': { activityId: string; logId?: string };
  'activity.rescheduled': { activityId: string; logId?: string; scheduledAt: string };
  'drift.escalated': { activityId: string; level: number };
  'guard.triggered': { type: 'hard' | 'soft' };
  'day.started': undefined;
  'context.updated': undefined;
  'onboarding.complete': undefined;
  'wakeword.detected': { timestamp: number };
  'intent.raw_audio_parsed': { text: string };
  'jarvis.state_changed': {
    state: 'idle' | 'listening' | 'transcribing' | 'thinking' | 'acting' | 'speaking';
    sessionId: string | null;
  };
  'jarvis.reply_ready': { text: string };
  'jarvis.speaking': { isSpeaking: boolean };
  'jarvis.idle': undefined;
  'ui.toast': { kind: 'success' | 'info' | 'error'; message: string; durationMs?: number };
};

export type EventName = keyof SubscriptionMap;
export type EventHandler<T extends EventName> = (payload: SubscriptionMap[T]) => void;

class EventBus {
  private handlers: { [K in EventName]?: EventHandler<K>[] } = {};

  subscribe<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event]!.push(handler as any);

    return () => {
      this.handlers[event] = this.handlers[event]!.filter(h => h !== handler) as any;
    };
  }

  // Alias for subscribe
  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    return this.subscribe(event, handler);
  }

  emit<T extends EventName>(event: T, payload: SubscriptionMap[T]): void {
    console.log(`[BUS] emit ${event}`, payload || '');
    const eventHandlers = this.handlers[event];
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          const maybePromise = (handler as any)(payload);
          if (maybePromise && typeof maybePromise.then === 'function') {
            Promise.resolve(maybePromise).catch((err) => {
              console.error(`[BUS] Async handler error for ${event}`, err);
            });
          }
        } catch (err) {
          console.error(`[BUS] Error in handler for ${event}`, err);
        }
      });
    }
  }
}

export const bus = new EventBus();
