import { bus } from '../../events/bus';
import { driftRepo, activityRepo, consequenceRepo } from '../../db/repositories';
import { aiService } from '../ai/aiService';
import { useAppStore, useChatStore } from '../../store';

export const consequenceEngine = {
  start() {
    bus.subscribe('activity.skipped', async ({ activityId, logId, reason }) => {
      console.log(`[Engine] Processing skip for ${activityId}`);
      try {
        if (logId) {
          activityRepo.updateLogStatus(logId, 'skipped', reason);
        }

        // Record miss -> increases drift
        driftRepo.recordMiss(activityId);

        // Verify state to see if consequence is needed
        // Assuming drift summary holds the current level
        // Simplified approach: just trigger AI for testing
        const msg = await aiService.generateConsequenceMessage(activityId);

        if (msg) {
          consequenceRepo.create({
            id: `cons-${Date.now()}`,
            activityId,
            triggeredAt: new Date().toISOString(),
            type: 'drift', // Hardcoded simplified
            messageDelivered: msg,
            userResponse: 'pending',
            createdAt: new Date().toISOString()
          });

          // Inject message directly to coach chat store 
          useChatStore.getState().addMessage({
            role: 'assistant',
            content: `[CONSEQUENCE:drift] ${msg}`,
            source: 'typed',
          });
        }

        bus.emit('schedule.updated', undefined);
        bus.emit('ui.toast', {
          kind: 'info',
          message: 'Block marked skipped.',
        });
        useAppStore.getState().refreshSchedule();
      } catch (e) {
        console.error('[Engine] Failed to process skip', e);
        bus.emit('ui.toast', {
          kind: 'error',
          message: 'Could not mark that block as skipped.',
        });
      }
    });

    bus.subscribe('activity.completed', ({ activityId, logId }) => {
      if (!logId) {
        console.warn(`[Engine] Missing logId for completion ${activityId}`);
        return;
      }

      activityRepo.updateLogStatus(logId, 'done');
      bus.emit('schedule.updated', undefined);
      bus.emit('ui.toast', {
        kind: 'success',
        message: 'Block marked done.',
      });
      useAppStore.getState().refreshSchedule();
      console.log(`[Engine] Recorded completion for ${activityId} (${logId})`);
    });

    bus.subscribe('activity.deferred', ({ activityId, logId }) => {
      if (!logId) {
        console.warn(`[Engine] Missing logId for defer ${activityId}`);
        return;
      }

      activityRepo.updateLogStatus(logId, 'deferred');
      bus.emit('schedule.updated', undefined);
      bus.emit('ui.toast', {
        kind: 'info',
        message: 'Block deferred.',
      });
      useAppStore.getState().refreshSchedule();
    });

    bus.subscribe('activity.rescheduled', ({ activityId, logId, scheduledAt }) => {
      if (!logId) {
        console.warn(`[Engine] Missing logId for reschedule ${activityId}`);
        return;
      }

      activityRepo.updateLogSchedule(logId, scheduledAt);
      bus.emit('schedule.updated', undefined);
      bus.emit('ui.toast', {
        kind: 'success',
        message: 'Block rescheduled.',
      });
      useAppStore.getState().refreshSchedule();
    });
  }
};
