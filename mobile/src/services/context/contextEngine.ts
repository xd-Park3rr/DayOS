import { getDb } from '../../db/client';
import { bus } from '../../events/bus';
import { aiService } from '../ai/aiService';
import { ttsService } from '../ai/ttsService';
import { musicService } from '../music/musicService';

let _activeContext: string = 'default';

export const contextEngine = {
  getCurrentContext: () => _activeContext,

  start: () => {
    bus.subscribe('context.updated', async () => {
      console.log('[Context Engine] Context update requested');
      
      // In a real device we would poll RNBluetoothClassic.getConnectedDevices()
      // to see which mapped devices are currently active.
      
      // For this implementation, we will mock the transition for testing
      // or assume the bluetooth listener passes the mapped device.
      
      // E.g., if a headphones mapped to 'gym' connects:
      // 1. Fetch mapping
      // const mapping = ...
      
      // 2. State transition
      // if (_activeContext !== mapping.target_activity_id) {
      //   _activeContext = mapping.target_activity_id;
      //   
      //   // 3. Actions
      //   if (mapping.auto_dnd) enableDND();
      //   if (mapping.target_music_uri) playMusic(mapping.target_music_uri);
      //   
      //   // 4. Greeting
      //   const greeting = await aiService.chat([{ role: 'user', content: `I just entered context: ${_activeContext}. Give me a 1 sentence motivation.` }]);
      //   await ttsService.speak(greeting);
      // }
    });

    bus.subscribe('day.started', () => {
       // Morning routine finished, start context watching
       console.log('[Context Engine] Day started. Engine active.');
    });
  },

  // Helper method for the UI or other services to manually push a simulated context switch
  simulateContextSwitch: async (macAddress: string) => {
    const db = getDb();
    const mapping = db.getFirstSync<{target_activity_id: string, target_music_uri: string, auto_dnd: number}>(
      'SELECT * FROM bluetooth_device_map WHERE mac_address = ?',
      [macAddress]
    );

    if (mapping && _activeContext !== mapping.target_activity_id) {
      _activeContext = mapping.target_activity_id;
      
      console.log(`[Context Engine] Switching to context: ${_activeContext}`);
      
      // We would normally fire integration triggers here (e.g., Spotify, DND Native API)
      
      // Jarvis Greeting
      const greeting = await aiService.chat([
        { role: 'user', content: `I just switched to my activity: ${_activeContext}. Give me a 1 sentence motivation without any emojis or markdown.` }
      ]);
      await ttsService.speak(greeting);
      
      bus.emit('context.updated', undefined);
    }
  }
};
