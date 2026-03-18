import Constants, {
  AppOwnership,
  ExecutionEnvironment,
} from 'expo-constants';
import { NativeModules, TurboModuleRegistry } from 'react-native';
import type {
  RuntimeCapabilitySnapshot,
  RuntimeModuleKey,
  RuntimeModuleStatus,
  RuntimeShellType,
} from '../../types';

const MODULE_DEFINITIONS: Array<{
  key: RuntimeModuleKey;
  label: string;
  detail: string;
  isAvailable: () => boolean;
}> = [
  {
    key: 'rnWhisper',
    label: 'RNWhisper',
    detail: 'Whisper TurboModule for speech-to-text.',
    isAvailable: () => Boolean(TurboModuleRegistry.get('RNWhisper')),
  },
  {
    key: 'picovoicePorcupine',
    label: 'Picovoice Porcupine',
    detail: 'Wake-word native module.',
    isAvailable: () => Boolean(NativeModules.PvPorcupine),
  },
  {
    key: 'picovoiceVoiceProcessor',
    label: 'Picovoice Voice Processor',
    detail: 'Microphone frame capture native module.',
    isAvailable: () => Boolean(NativeModules.PvVoiceProcessor),
  },
  {
    key: 'bluetoothClassic',
    label: 'Bluetooth Classic',
    detail: 'Bluetooth Classic bridge module.',
    isAvailable: () => Boolean(NativeModules.RNBluetoothClassic),
  },
  {
    key: 'dayosAppControl',
    label: 'DayOS App Control',
    detail: 'Custom Android app-control native module.',
    isAvailable: () => Boolean(NativeModules.DayOSAppControl),
  },
];

let lastLoggedFingerprint: string | null = null;

const resolveShellType = (): RuntimeShellType => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return 'dev_client';
  }

  if (
    Constants.executionEnvironment === ExecutionEnvironment.Standalone ||
    Constants.executionEnvironment === ExecutionEnvironment.Bare
  ) {
    return 'standalone';
  }

  if (Constants.appOwnership === AppOwnership.Expo) {
    return 'expo_go';
  }

  return 'unknown';
};

const buildUnsupportedReason = (
  shellType: RuntimeShellType,
  missingModules: RuntimeModuleKey[]
): string | null => {
  if (shellType === 'expo_go') {
    return 'Expo Go cannot load the native DayOS modules required for voice, Bluetooth, and device control.';
  }

  return null;
};

const buildDebugFingerprint = (
  shellType: RuntimeShellType,
  moduleStatus: RuntimeModuleStatus[]
): string => {
  const moduleFingerprint = moduleStatus
    .map((item) => `${item.key}:${item.available ? '1' : '0'}`)
    .join('|');
  return [
    `shell:${shellType}`,
    `env:${Constants.executionEnvironment ?? 'null'}`,
    `ownership:${Constants.appOwnership ?? 'null'}`,
    moduleFingerprint,
  ].join('|');
};

const buildModuleStatus = (): RuntimeModuleStatus[] => {
  return MODULE_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    available: definition.isAvailable(),
    required: true,
    detail: definition.detail,
  }));
};

const shellTypeLabels: Record<RuntimeShellType, string> = {
  expo_go: 'Expo Go',
  dev_client: 'DayOS Dev Client',
  standalone: 'Standalone Android Build',
  unknown: 'Unknown Android Shell',
};

export const runtimeDiagnosticsService = {
  getSnapshot(): RuntimeCapabilitySnapshot {
    const shellType = resolveShellType();
    const moduleStatus = buildModuleStatus();
    const missingModules = moduleStatus
      .filter((item) => item.required && !item.available)
      .map((item) => item.key);
    const unsupportedReason = buildUnsupportedReason(shellType, missingModules);

    return {
      shellType,
      executionEnvironment: Constants.executionEnvironment ?? null,
      appOwnership: Constants.appOwnership ?? null,
      isSupported: shellType !== 'expo_go',
      unsupportedReason,
      missingModules,
      moduleStatus,
      debugFingerprint: buildDebugFingerprint(shellType, moduleStatus),
      detectedAt: new Date().toISOString(),
    };
  },

  logUnsupportedRuntime(snapshot: RuntimeCapabilitySnapshot): void {
    if (snapshot.isSupported || lastLoggedFingerprint === snapshot.debugFingerprint) {
      return;
    }

    lastLoggedFingerprint = snapshot.debugFingerprint;
    console.error('[Runtime] Unsupported DayOS runtime detected.', snapshot);
  },

  getShellLabel(shellType: RuntimeShellType): string {
    return shellTypeLabels[shellType] || shellTypeLabels.unknown;
  },
};
