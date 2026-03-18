import { getDb } from '../../db/client';
import { bus } from '../../events/bus';

const loadBluetoothModule = async (): Promise<any | null> => {
  try {
    const commonJsModule = require('react-native-bluetooth-classic') as Record<string, unknown>;
    const moduleValue = (commonJsModule.default as Record<string, unknown> | undefined) || commonJsModule;
    if (typeof moduleValue?.isBluetoothAvailable !== 'function') {
      return null;
    }

    const nativeModule = (moduleValue as { _nativeModule?: unknown })._nativeModule;
    if (!nativeModule) {
      console.warn('[BT Context] Bluetooth native module is not installed in the current build.');
      return null;
    }

    return moduleValue;
  } catch (e) {
    console.warn('[BT Context] Bluetooth native module is unavailable in this runtime.', e);
    return null;
  }
};

export const bluetoothContext = {
  startMonitoring: async () => {
    try {
      const RNBluetoothClassic = await loadBluetoothModule();
      if (!RNBluetoothClassic) {
        return;
      }

      const available = await RNBluetoothClassic.isBluetoothAvailable();
      if (!available) {
        console.warn('[BT Context] Bluetooth is not available on this device');
        return;
      }

      RNBluetoothClassic.onDeviceConnected((event: any) => {
        console.log(`[BT Context] Connected: ${event.device.name} (${event.device.address})`);
        
        const db = getDb();
        const mapping = db.getFirstSync<{target_activity_id: string, target_music_uri: string, auto_dnd: number}>(
          'SELECT * FROM bluetooth_device_map WHERE mac_address = ?',
          [event.device.address]
        );

        if (mapping) {
          bus.emit('context.updated', undefined);
          console.log('[BT Context] Recognized mapped device. Emitted context change.');
          
          // The contextEngine handles the actual transition, but we can also fire DND directly if needed,
          // though it's better to let contextEngine synthesize all signals.
        }
      });

      RNBluetoothClassic.onDeviceDisconnected((event: any) => {
        console.log(`[BT Context] Disconnected: ${event.device.name}`);
        bus.emit('context.updated', undefined);
      });
      
      console.log('[BT Context] Monitoring started.');
    } catch (e) {
      console.error('[BT Context] Failed to start:', e);
    }
  },
  
  getBondedDevices: async () => {
    try {
      const RNBluetoothClassic = await loadBluetoothModule();
      if (!RNBluetoothClassic) {
        return [];
      }

      const devices = await RNBluetoothClassic.getBondedDevices();
      return devices;
    } catch (e) {
      console.error('Failed to get bonded devices', e);
      return [];
    }
  }
};
