import * as IntentLauncher from 'expo-intent-launcher';
import { Platform, Linking } from 'react-native';

export const deviceControlService = {
  
  /**
   * Opens the Google Calendar app specifically to the "Create Event" screen
   */
  openCalendarCreate: async (params: { title?: string, time?: string, date?: string }) => {
    if (Platform.OS === 'android') {
      try {
        // Use Android Intent to deep link directly into Calendar creation
        await IntentLauncher.startActivityAsync('android.intent.action.INSERT', {
          data: 'content://com.android.calendar/events',
          extra: {
            title: params.title || '',
            // We would parse time/date into MS here for beginTime/endTime extras
          }
        });
        return true;
      } catch (e) {
        console.error('[Device Control] Failed to launch Android Calendar Intent', e);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      // iOS: Try URL scheme or fallback to Apple Shortcuts
      try {
        await Linking.openURL('calshow://');
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  /**
   * Triggers the custom AccessibilityService plugin (Android only)
   * to overlay a block screen on top of a target app.
   */
  blockApplication: async (targetAppPackage: string, durationMinutes: number) => {
    if (Platform.OS === 'android') {
      console.log(`[Device Control] Triggering Accessibility Service to block ${targetAppPackage} for ${durationMinutes}m`);
      // Implementation:
      // Send a broadcast intent or write to a shared NativeModule that the AccessibilityService monitors
      /*
      await NativeModules.DayOSAccessibilityManager.setBlockRule(targetAppPackage, durationMinutes);
      */
      return true;
    } else {
      console.warn('[Device Control] App blocking requires iOS ScreenTime API / MDM profiles.');
      return false;
    }
  },
  
  /**
   * Triggers an Apple Shortcut (iOS specific bypass for deep system control)
   */
  triggerIOSShortcut: async (shortcutName: string, inputParams: any = {}) => {
    if (Platform.OS !== 'ios') return false;
    
    try {
      // Build the shortcuts:// URL scheme
      const url = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}&input=${encodeURIComponent(JSON.stringify(inputParams))}`;
      await Linking.openURL(url);
      return true;
    } catch (e) {
      console.error('[Device Control] Failed to trigger Shortcut', e);
      return false;
    }
  }
};
