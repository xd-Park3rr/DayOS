import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useOnboardingStore, useAppStore } from '../../store';
import { aiService } from '../../services/ai/aiService';
import { COLORS } from '../../constants';
import { categoryRepo, profileRepo } from '../../db/repositories';
import { bus } from '../../events/bus';

const Stack = createNativeStackNavigator();
const COMPOSER_MIN_HEIGHT = 48;
const COMPOSER_MAX_HEIGHT = 140;
const ONBOARDING_MAX_WIDTH = 560;

const AREAS = [
  'University/school',
  'My own business',
  'Martial arts/sport',
  'Job/employer',
  'Creative work',
  'Parenting',
  'Health recovery',
  'Personal growth',
  'Side projects',
  'Relationships',
  'Finance',
  'Other',
];

function AreaSelection({ navigation }: any) {
  const { selectedAreas, setAreas } = useOnboardingStore();

  const toggleArea = (area: string) => {
    if (selectedAreas.includes(area)) {
      setAreas(selectedAreas.filter((item) => item !== area));
      return;
    }

    setAreas([...selectedAreas, area]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.staticScreenScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.contentShell}>
          <Text style={styles.header}>What does your life run on?</Text>

          <View style={styles.chipContainer}>
            {AREAS.map((area) => (
              <TouchableOpacity
                key={area}
                style={[styles.chip, selectedAreas.includes(area) && styles.chipActive]}
                onPress={() => toggleArea(area)}
              >
                <Text
                  style={[styles.chipText, selectedAreas.includes(area) && styles.chipTextActive]}
                >
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.screenSpacer} />

          <TouchableOpacity
            style={[styles.ctaButton, selectedAreas.length === 0 && styles.ctaDisabled]}
            disabled={selectedAreas.length === 0}
            onPress={() => navigation.navigate('Chat')}
          >
            <Text style={styles.ctaText}>Continue -&gt;</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OnboardingChat({ navigation }: any) {
  const { selectedAreas, chatHistory, addMessage, setFinalPayload } = useOnboardingStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [composerHeight, setComposerHeight] = useState(COMPOSER_MIN_HEIGHT);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = (animated: boolean) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  };

  useEffect(() => {
    if (chatHistory.length === 0) {
      addMessage({
        role: 'assistant',
        content: `You selected: ${selectedAreas.join(', ')}. What does a typical week look like for you in these areas?`,
      });
    }
  }, [chatHistory.length, selectedAreas, addMessage]);

  useEffect(() => {
    scrollToBottom(true);
  }, [chatHistory.length, loading]);

  const finalizeOnboarding = async () => {
    if (loading) {
      return;
    }

    setLoading(true);

    const currentHistory = [...useOnboardingStore.getState().chatHistory];

    try {
      const response = await aiService.onboardingTurn(currentHistory, true);
      const payload = aiService.parseOnboardingPayload(response);
      setFinalPayload(payload);
      navigation.navigate('Confirm');
    } catch (error) {
      console.warn('[Onboarding Finalize] Falling back to local payload.', error);
      const fallbackPayload = aiService.buildOnboardingPayloadFallback(selectedAreas, currentHistory);
      setFinalPayload(fallbackPayload);
      navigation.navigate('Confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) {
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setComposerHeight(COMPOSER_MIN_HEIGHT);
    addMessage({ role: 'user', content: userMsg });
    setLoading(true);

    const newHistory = [...useOnboardingStore.getState().chatHistory];

    try {
      const response = await aiService.onboardingTurn(newHistory, false);
      addMessage({ role: 'assistant', content: response });
    } catch (error) {
      console.error('[Onboarding Chat Error]', error);
      addMessage({
        role: 'assistant',
        content: 'I lost that thread. Repeat your last answer once and continue.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <View style={styles.chatShell}>
          <ScrollView
            ref={scrollRef}
            style={styles.messageScroll}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollToBottom(true)}
          >
            {chatHistory.map((message, index) => (
              <View key={index} style={message.role === 'user' ? styles.msgUser : styles.msgCoach}>
                <Text style={message.role === 'user' ? styles.msgTextUser : styles.msgTextCoach}>
                  {String(message.content)}
                </Text>
              </View>
            ))}

            {loading && <ActivityIndicator color={COLORS.accent} style={styles.loadingIndicator} />}
          </ScrollView>

          <View style={styles.composerArea}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { height: composerHeight }]}
                value={input}
                onChangeText={setInput}
                placeholder="Type here..."
                placeholderTextColor={COLORS.textHint}
                multiline
                textAlignVertical="top"
                scrollEnabled={composerHeight >= COMPOSER_MAX_HEIGHT}
                onContentSizeChange={(event) => {
                  const nextHeight = Math.min(
                    COMPOSER_MAX_HEIGHT,
                    Math.max(COMPOSER_MIN_HEIGHT, event.nativeEvent.contentSize.height + 18)
                  );
                  setComposerHeight(nextHeight);
                }}
                onFocus={() => scrollToBottom(true)}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton, loading && styles.ctaDisabled]}
              disabled={loading}
              onPress={() => {
                void finalizeOnboarding();
              }}
            >
              <Text style={styles.secondaryButtonText}>Complete Onboarding Now</Text>
            </TouchableOpacity>

            <Text style={styles.helperText}>
              Finish whenever you have given enough context. You can refine categories later.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CategoryConfirm() {
  const { finalCategories, coachTone } = useOnboardingStore();
  const { setOnboardingComplete } = useAppStore();

  const handleConfirm = () => {
    try {
      profileRepo.create({
        id: 'user-1',
        name: 'User',
        onboardingComplete: true,
        coachTone: (coachTone as any) || 'direct',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      finalCategories.forEach((category: any) => {
        categoryRepo.create({
          id: `cat-${Date.now()}-${Math.random()}`,
          name: category.name,
          colour: category.colour || COLORS.accent,
          defaultSeverity: category.defaultSeverity || 'medium',
          identityAnchor: category.identityAnchor,
          screenTimeAllowed: !!category.screenTimeAllowed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      bus.emit('onboarding.complete', undefined);
      setOnboardingComplete(true);
    } catch (error) {
      console.error('[Onboarding Confirm Error]', error);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.staticScreenScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.contentShell}>
          <Text style={styles.header}>This is what I heard.</Text>

          {finalCategories.map((category: any, index: number) => (
            <View key={index} style={styles.catCard}>
              <View style={[styles.colorDot, { backgroundColor: category.colour || COLORS.accent }]} />
              <Text style={styles.catName}>{category.name}</Text>
              <Text style={styles.catAnchor}>{category.identityAnchor}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.ctaButton} onPress={handleConfirm}>
            <Text style={styles.ctaText}>This is me - let's go</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function OnboardingFlow() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
      <Stack.Screen name="Areas" component={AreaSelection} />
      <Stack.Screen name="Chat" component={OnboardingChat} />
      <Stack.Screen name="Confirm" component={CategoryConfirm} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  staticScreenScroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  contentShell: {
    flex: 1,
    width: '100%',
    maxWidth: ONBOARDING_MAX_WIDTH,
    alignSelf: 'center',
  },
  chatShell: {
    flex: 1,
    width: '100%',
    maxWidth: ONBOARDING_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  header: {
    fontSize: 28,
    lineHeight: 36,
    color: COLORS.textPrimary,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    color: COLORS.textMuted,
  },
  chipTextActive: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  screenSpacer: {
    flex: 1,
    minHeight: 32,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  messageScroll: {
    flex: 1,
  },
  messageList: {
    paddingBottom: 16,
  },
  composerArea: {
    paddingTop: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    maxHeight: COMPOSER_MAX_HEIGHT,
  },
  sendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 48,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
  },
  sendBtnText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  helperText: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  loadingIndicator: {
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  msgCoach: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    borderBottomLeftRadius: 4,
    marginBottom: 10,
    maxWidth: '84%',
  },
  msgUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 12,
    borderBottomRightRadius: 4,
    marginBottom: 10,
    maxWidth: '84%',
  },
  msgTextCoach: {
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  msgTextUser: {
    color: COLORS.background,
    fontWeight: '600',
    lineHeight: 21,
  },
  catCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  catName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  catAnchor: {
    color: COLORS.textMuted,
    marginTop: 5,
    marginLeft: 20,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    left: 16,
    top: 20,
  },
});
