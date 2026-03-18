import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants';
import { bus } from '../events/bus';
import { jarvisService } from '../services/ai/jarvisService';
import type { JarvisSessionState } from '../types';

export function JarvisOverlay() {
  const [visible, setVisible] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [input, setInput] = useState('');
  const [sessionState, setSessionState] = useState<JarvisSessionState>('idle');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setTranscript(trimmed);
    setReply('');
    setInput('');
    await jarvisService.submitText(trimmed);
  };

  useEffect(() => {
    let isActive = false;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    const startPulse = () => {
      pulseLoop?.stop();
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.5,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.3,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.7,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseLoop.start();
    };

    const cleanup = [
      bus.subscribe('wakeword.detected', () => {
        setVisible(true);
        setTranscript('');
        setReply('');
        setInput('');
        startPulse();
        isActive = true;
      }),
      bus.subscribe('jarvis.state_changed', ({ state }) => {
        setSessionState(state);
      }),
      bus.subscribe('intent.raw_audio_parsed', ({ text }) => {
        if (isActive) {
          setTranscript(text);
        }
      }),
      bus.subscribe('jarvis.reply_ready', ({ text }) => {
        if (isActive) {
          setReply(text);
        }
      }),
      bus.subscribe('jarvis.idle', () => {
        setVisible(false);
        setTranscript('');
        setReply('');
        setInput('');
        setSessionState('idle');
        pulseAnim.stopAnimation();
        opacityAnim.stopAnimation();
        pulseLoop?.stop();
        isActive = false;
      }),
    ];

    return () => {
      pulseLoop?.stop();
      cleanup.forEach((unsub: any) => unsub());
    };
  }, [opacityAnim, pulseAnim]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={() => void jarvisService.cancelSession()}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>

          <View style={styles.orbContainer}>
            <Animated.View
              style={[
                styles.orbPulse,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: opacityAnim,
                },
              ]}
            />
            <View style={styles.orbCenter} />
          </View>

          <Text style={styles.stateLabel}>{labelForState(sessionState)}</Text>
          <Text style={styles.transcript}>
            {transcript || 'Listening or type a command.'}
          </Text>

          {reply ? (
            <View style={styles.replyCard}>
              <Text style={styles.replyLabel}>Jarvis</Text>
              <Text style={styles.replyText}>{reply}</Text>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a command"
              placeholderTextColor="rgba(240, 237, 232, 0.45)"
              autoCapitalize="sentences"
              autoCorrect
              onSubmitEditing={() => {
                void submit();
              }}
            />
            <TouchableOpacity style={styles.sendButton} onPress={() => void submit()}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const labelForState = (state: JarvisSessionState): string => {
  switch (state) {
    case 'listening':
      return 'Wake word heard';
    case 'transcribing':
      return 'Transcribing';
    case 'thinking':
      return 'Thinking';
    case 'acting':
      return 'Acting';
    case 'speaking':
      return 'Speaking';
    default:
      return 'Ready';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(14, 15, 17, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  closeText: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  orbContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  orbPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
  },
  orbCenter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
  },
  transcript: {
    color: '#f0ede8',
    fontSize: 24,
    fontFamily: 'DMSans_500Medium',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 18,
  },
  stateLabel: {
    marginBottom: 12,
    color: COLORS.textMuted,
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  replyCard: {
    width: '100%',
    maxWidth: 460,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 22,
  },
  replyLabel: {
    color: COLORS.accent,
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  replyText: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSans',
    fontSize: 14,
    lineHeight: 22,
  },
  inputRow: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 18,
    color: COLORS.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    fontFamily: 'DMSans',
    fontSize: 15,
  },
  sendButton: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  sendText: {
    color: COLORS.background,
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
  },
});
