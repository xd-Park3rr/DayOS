declare module 'whisper.rn' {
  export type TranscribeOptions = {
    language?: string;
    maxThreads?: number;
    nProcessors?: number;
    maxContext?: number;
    maxLen?: number;
    tokenTimestamps?: boolean;
    wordThold?: number;
    duration?: number;
    temperature?: number;
    temperatureInc?: number;
    beamSize?: number;
    bestOf?: number;
    prompt?: string;
  };

  export class WhisperContext {
    transcribeData(
      data: ArrayBuffer,
      options: TranscribeOptions
    ): {
      stop: () => Promise<void>;
      promise: Promise<{
        result?: string;
      }>;
    };
  }

  export class WhisperVadContext {
    detectSpeechData(
      data: ArrayBuffer,
      options?: Record<string, unknown>
    ): Promise<Array<{ t0: number; t1: number }>>;
  }

  export function initWhisper(options: {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
    useCoreMLIos?: boolean;
    useFlashAttn?: boolean;
  }): Promise<WhisperContext>;

  export function initWhisperVad(options: {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
    nThreads?: number;
  }): Promise<WhisperVadContext>;
}

declare module 'whisper.rn/realtime-transcription' {
  import type { WhisperContext, WhisperVadContext, TranscribeOptions } from 'whisper.rn';

  export type RealtimeTranscribeEvent = {
    type: 'start' | 'transcribe' | 'end' | 'error';
    sliceIndex: number;
    data?: {
      result?: string;
    };
    isCapturing?: boolean;
    processTime?: number;
    recordingTime?: number;
  };

  export class RealtimeTranscriber {
    constructor(
      dependencies: {
        whisperContext: WhisperContext;
        vadContext?: WhisperVadContext;
        audioStream: unknown;
      },
      options?: {
        audioSliceSec?: number;
        audioMinSec?: number;
        maxSlicesInMemory?: number;
        vadPreset?: string;
        autoSliceOnSpeechEnd?: boolean;
        autoSliceThreshold?: number;
        promptPreviousSlices?: boolean;
        vadThrottleMs?: number;
        transcribeOptions?: TranscribeOptions;
        audioStreamConfig?: Record<string, unknown>;
        logger?: (message: string) => void;
      },
      callbacks?: {
        onTranscribe?: (event: RealtimeTranscribeEvent) => void;
        onError?: (error: string) => void;
      }
    );

    start(): Promise<void>;
    stop(): Promise<void>;
    release(): Promise<void>;
  }
}

declare module 'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter' {
  export class AudioPcmStreamAdapter {
    initialize(config: Record<string, unknown>): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRecording(): boolean;
    onData(callback: (data: unknown) => void): void;
    onError(callback: (error: string) => void): void;
    onStatusChange(callback: (isRecording: boolean) => void): void;
    release(): Promise<void>;
  }
}
