import { Platform } from 'react-native';
import { bus } from '../../events/bus';
import { microphonePermission } from './microphonePermission';

const PICOVOICE_ACCESS_KEY = process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY || '';
const PICOVOICE_BUILTIN_KEYWORD = process.env.EXPO_PUBLIC_PICOVOICE_BUILTIN_KEYWORD || 'JARVIS';
const PICOVOICE_CUSTOM_KEYWORD_PATH =
  process.env.EXPO_PUBLIC_PICOVOICE_KEYWORD_PATH ||
  (Platform.OS === 'android' ? 'JARVIS_en_android_v4_0_0.ppn' : '');

type WakeWordModule = {
  BuiltInKeywords: Record<string, string>;
  PorcupineManager: {
    fromKeywordPaths: (
      accessKey: string,
      keywordPaths: string[],
      detectionCallback: (keywordIndex: number) => void,
      errorCallback?: (error: unknown) => void
    ) => Promise<WakeWordManager>;
    fromBuiltInKeywords: (
      accessKey: string,
      keywords: string[],
      detectionCallback: (keywordIndex: number) => void,
      errorCallback?: (error: unknown) => void
    ) => Promise<WakeWordManager>;
  };
};

type WakeWordManager = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  delete: () => void;
};

let porcupineManager: WakeWordManager | null = null;
let isListening = false;
let detectionLocked = false;

const loadWakeWordModule = async (): Promise<WakeWordModule | null> => {
  try {
    const packageModule = require('@picovoice/porcupine-react-native') as Record<string, unknown>;
    const moduleValue = (packageModule.default as WakeWordModule | undefined) || (packageModule as unknown as WakeWordModule);
    if (moduleValue?.PorcupineManager) {
      return moduleValue;
    }
  } catch (packageError) {
    try {
      const commonJsModule = require('@picovoice/porcupine-react-native/lib/commonjs/index') as Record<string, unknown>;
      const moduleValue = (commonJsModule.default as WakeWordModule | undefined) || (commonJsModule as unknown as WakeWordModule);
      if (moduleValue?.PorcupineManager) {
        return moduleValue;
      }
    } catch (commonJsError) {
      console.warn('[WakeWord] Failed to load Picovoice JS entrypoint.', commonJsError ?? packageError);
    }
  }

  return null;
};

const resolveBuiltInKeyword = (module: WakeWordModule): string => {
  const requested = PICOVOICE_BUILTIN_KEYWORD.toUpperCase();
  return module.BuiltInKeywords[requested] || module.BuiltInKeywords.JARVIS || 'jarvis';
};

const createPorcupineManager = async (
  wakeWordModule: WakeWordModule,
  keywordPaths: string[],
  onDetected: (keywordIndex: number) => void,
  onError: (error: unknown) => void
): Promise<WakeWordManager> => {
  const customKeywordPaths =
    keywordPaths.length > 0
      ? keywordPaths
      : PICOVOICE_CUSTOM_KEYWORD_PATH
        ? [PICOVOICE_CUSTOM_KEYWORD_PATH]
        : [];

  if (customKeywordPaths.length > 0) {
    try {
      console.log('[WakeWord] Using custom keyword asset.', customKeywordPaths[0]);
      return await wakeWordModule.PorcupineManager.fromKeywordPaths(
        PICOVOICE_ACCESS_KEY,
        customKeywordPaths,
        onDetected,
        onError
      );
    } catch (error) {
      console.warn('[WakeWord] Failed to load custom keyword asset. Falling back to built-in keyword.', error);
    }
  }

  return wakeWordModule.PorcupineManager.fromBuiltInKeywords(
    PICOVOICE_ACCESS_KEY,
    [resolveBuiltInKeyword(wakeWordModule)],
    onDetected,
    onError
  );
};

export const wakeWordService = {
  startListening: async (keywordPaths: string[] = []): Promise<boolean> => {
    if (isListening) {
      return true;
    }

    if (!PICOVOICE_ACCESS_KEY) {
      console.warn('[WakeWord] EXPO_PUBLIC_PICOVOICE_ACCESS_KEY is not set. Background wake-word is disabled.');
      return false;
    }

    const hasMicrophoneAccess = await microphonePermission.ensure('wake-word detection');
    if (!hasMicrophoneAccess) {
      return false;
    }

    try {
      if (porcupineManager) {
        await porcupineManager.start();
        isListening = true;
        detectionLocked = false;
        console.log('[WakeWord] Active and listening in background.');
        return true;
      }

      const wakeWordModule = await loadWakeWordModule();
      if (!wakeWordModule) {
        return false;
      }

      const onDetected = (keywordIndex: number) => {
        if (keywordIndex >= 0 && !detectionLocked) {
          detectionLocked = true;
          console.log('[WakeWord] Wake word detected!', keywordIndex);
          bus.emit('wakeword.detected', { timestamp: Date.now() });
        }
      };

      const onError = (error: any) => {
        console.error('[WakeWord] Error during processing:', error);
      };

      porcupineManager = await createPorcupineManager(
        wakeWordModule,
        keywordPaths,
        onDetected,
        onError
      );

      await porcupineManager.start();
      isListening = true;
      detectionLocked = false;
      console.log('[WakeWord] Active and listening in background.');
      return true;
    } catch (err) {
      console.error('[WakeWord] Initialization failed:', err);
      porcupineManager = null;
      isListening = false;
      return false;
    }
  },

  stopListening: async (): Promise<void> => {
    if (!isListening || !porcupineManager) {
      return;
    }

    try {
      await porcupineManager.stop();
      isListening = false;
      detectionLocked = true;
      console.log('[WakeWord] Stopped listening.');
    } catch (err) {
      console.error('[WakeWord] Error stopping:', err);
    }
  },
};
