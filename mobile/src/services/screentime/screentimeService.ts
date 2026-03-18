import { bus } from '../../events/bus';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const SCREEN_TIME_TASK = 'BACKGROUND_SCREEN_TIME_TASK';

const loadUsageStats = async (): Promise<any | null> => {
  try {
    return (await import('react-native-usage-stats')).default;
  } catch (e) {
    console.warn('[ScreenTime] UsageStats native module is unavailable in this runtime.', e);
    return null;
  }
};

TaskManager.defineTask(SCREEN_TIME_TASK, async () => {
  try {
    const UsageStats = await loadUsageStats();
    if (!UsageStats) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const stats = await UsageStats?.getUsageStats?.('daily') || [];
    let totalUsage = 0;
    if (stats && Array.isArray(stats)) {
      stats.forEach((pkg: any) => {
        totalUsage += pkg.totalTimeInForeground || 0;
      });
    }
    
    // Pretend 10 min hard limit config on non-allowed apps.
    const allowedLimitMs = 10 * 60 * 1000;
    
    if (totalUsage > allowedLimitMs * 0.8 && totalUsage < allowedLimitMs) {
      bus.emit('usage.threshold', { categoryId: 'all' });
    } else if (totalUsage >= allowedLimitMs) {
      bus.emit('usage.exceeded', { categoryId: 'all' });
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[ScreenTime Task Error]', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const screentimeService = {
  startMonitoring: async () => {
    const UsageStats = await loadUsageStats();
    if (!UsageStats) {
      return;
    }

    if (UsageStats && UsageStats.checkPermission) {
      UsageStats.checkPermission().then((hasPermission: boolean) => {
        if (!hasPermission) {
          console.log('[ScreenTime] Needs permission overlay. UsageStats.openUsageAccessSettings()');
        }
      }).catch((err: any) => {
        console.warn('[ScreenTime] Permission check failed:', err);
      });
    } else {
      console.warn('[ScreenTime] UsageStats is null or missing checkPermission. Monitoring not available.');
    }

    try {
      await BackgroundFetch.registerTaskAsync(SCREEN_TIME_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('[ScreenTime] Background fetch task registered.');
    } catch (err) {
      console.log('[ScreenTime] Task registration failed:', err);
    }

    // Jarvis Nudges/Blocks
    const { ttsService } = require('../ai/ttsService');
    const { aiService } = require('../ai/aiService');

    bus.on('usage.threshold', async () => {
      // 80% nudge
      const msg = await aiService.chat([
        { role: 'user', content: 'I am at 80% of my screen time limit today. Give me a sharp 1 sentence warning.' }
      ]);
      await ttsService.speak(msg);
    });

    bus.on('usage.exceeded', async () => {
      // 100% hard block
      const msg = await aiService.chat([
        { role: 'user', content: 'I just hit my screen time limit and am being blocked. Deliver a final direct consequence sentence.' }
      ]);
      await ttsService.speak(msg);
      // In a real Android build, we'd also call the blocking UI here.
    });
  }
};
