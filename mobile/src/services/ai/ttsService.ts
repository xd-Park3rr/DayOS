import * as Speech from 'expo-speech';
import { bus } from '../../events/bus';

let isSpeaking = false;

export function sanitiseForSpeech(text: string): string {
  if (!text) {
    return '';
  }

  let clean = text.replace(/#+\s/g, '');
  clean = clean.replace(/\*\*/g, '');
  clean = clean.replace(/\*/g, '');
  clean = clean.replace(/_/g, '');
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return clean.trim();
}

export const ttsService = {
  isSpeaking: () => isSpeaking,

  speak: async (text: string): Promise<boolean> => {
    const cleanText = sanitiseForSpeech(text);
    if (!cleanText) {
      return true;
    }

    if (isSpeaking) {
      await Speech.stop();
    }

    isSpeaking = true;
    bus.emit('jarvis.speaking', { isSpeaking: true });

    try {
      return await new Promise<boolean>((resolve) => {
        let settled = false;

        const finish = (success: boolean) => {
          if (settled) {
            return;
          }

          settled = true;
          isSpeaking = false;
          bus.emit('jarvis.speaking', { isSpeaking: false });
          resolve(success);
        };

        Speech.speak(cleanText, {
          language: 'en-US',
          rate: 0.95,
          pitch: 1,
          onDone: () => finish(true),
          onStopped: () => finish(true),
          onError: (error) => {
            console.error('[TTS] Device speech error:', error);
            finish(false);
          },
        });
      });
    } catch (error) {
      console.error('[TTS] Error speaking with device engine:', error);
      isSpeaking = false;
      bus.emit('jarvis.speaking', { isSpeaking: false });
      return false;
    }
  },

  stop: async (): Promise<void> => {
    try {
      await Speech.stop();
    } finally {
      isSpeaking = false;
      bus.emit('jarvis.speaking', { isSpeaking: false });
    }
  },
};
