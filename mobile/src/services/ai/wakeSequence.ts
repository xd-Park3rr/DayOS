import { sleepService } from '../sleep/sleepService';
import { aiService } from './aiService';
import { ttsService } from './ttsService';
import { bus } from '../../events/bus';

export const wakeSequence = {
  triggerWakeUp: async () => {
    try {
      console.log('[WakeSequence] Starting morning wake-up routine...');
      
      // 1. Fetch sleep data from last night
      const sleepData = await sleepService.getLastNightSleep();
      
      // 2. Generate briefing tailored to sleep and today's schedule
      const briefing = await aiService.generateWakeSequence(sleepData);
      
      // 3. Speak the briefing
      await ttsService.speak(briefing);

      // 4. Fire started event
      // This will trigger other listeners, e.g., the Context Engine to start
      bus.emit('day.started', undefined);
      
      console.log('[WakeSequence] Morning routine delivered.');
    } catch (e) {
      console.error('[WakeSequence] Error orchestrating wake-up:', e);
    }
  }
};
