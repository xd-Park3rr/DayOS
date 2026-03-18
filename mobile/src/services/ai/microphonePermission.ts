import { PermissionsAndroid, Platform } from 'react-native';

type VoiceProcessorModule = {
  VoiceProcessor: {
    instance: {
      hasRecordAudioPermission: () => Promise<boolean>;
    };
  };
};

let cachedVoiceProcessorModule: VoiceProcessorModule | null | undefined;

const pickVoiceProcessorModule = (moduleValue: unknown): VoiceProcessorModule | null => {
  if (!moduleValue || typeof moduleValue !== 'object') {
    return null;
  }

  const candidate = moduleValue as Record<string, unknown>;
  const voiceProcessor =
    (candidate.VoiceProcessor as VoiceProcessorModule['VoiceProcessor'] | undefined) ||
    ((candidate.default as Record<string, unknown> | undefined)?.VoiceProcessor as
      | VoiceProcessorModule['VoiceProcessor']
      | undefined);

  if (!voiceProcessor?.instance?.hasRecordAudioPermission) {
    return null;
  }

  return { VoiceProcessor: voiceProcessor };
};

const loadVoiceProcessor = async (): Promise<VoiceProcessorModule | null> => {
  if (cachedVoiceProcessorModule !== undefined) {
    return cachedVoiceProcessorModule;
  }

  try {
    cachedVoiceProcessorModule = pickVoiceProcessorModule(require('@picovoice/react-native-voice-processor'));
    if (cachedVoiceProcessorModule) {
      return cachedVoiceProcessorModule;
    }
  } catch (error) {
    console.warn('[Mic] Failed to load VoiceProcessor package entrypoint.', error);
  }

  try {
    cachedVoiceProcessorModule = pickVoiceProcessorModule(
      require('@picovoice/react-native-voice-processor/lib/commonjs/index')
    );
    return cachedVoiceProcessorModule;
  } catch (error) {
    console.warn('[Mic] Picovoice VoiceProcessor native module is unavailable in this runtime.', error);
    cachedVoiceProcessorModule = null;
    return null;
  }
};

const requestAndroidPermission = async (reason: string): Promise<boolean> => {
  try {
    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    const alreadyGranted = await PermissionsAndroid.check(permission);
    if (alreadyGranted) {
      return true;
    }

    const result = await PermissionsAndroid.request(permission, {
      title: 'Microphone access required',
      message: `DayOS needs microphone access for ${reason}.`,
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('[Mic] Android permission request failed.', error);
    return false;
  }
};

export const microphonePermission = {
  ensure: async (reason: string): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await requestAndroidPermission(reason);
      if (!granted) {
        console.warn(`[Mic] Microphone permission was denied for ${reason}.`);
      }
      return granted;
    }

    const voiceProcessor = await loadVoiceProcessor();
    if (voiceProcessor) {
      try {
        const granted = await voiceProcessor.VoiceProcessor.instance.hasRecordAudioPermission();
        if (!granted) {
          console.warn(`[Mic] Microphone permission was denied for ${reason}.`);
        }
        return granted;
      } catch (error) {
        console.warn('[Mic] VoiceProcessor permission flow failed. Falling back to platform permission request.', error);
      }
    }

    return false;
  },
};
