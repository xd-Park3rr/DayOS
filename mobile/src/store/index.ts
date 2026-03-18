import { create } from 'zustand';
import { CategoryConfig, Activity, ActivityBlockView, MomentumSummary } from '../types';
import type { ChatMessage } from '../services/ai/chatTypes';

export interface OnboardingState {
  selectedAreas: string[];
  chatHistory: ChatMessage[];
  finalCategories: CategoryConfig[];
  suggestedActivities: Activity[];
  coachTone: string;
  summary: string;
  setAreas: (areas: string[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setFinalPayload: (payload: any) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  selectedAreas: [],
  chatHistory: [],
  finalCategories: [],
  suggestedActivities: [],
  coachTone: 'direct',
  summary: '',
  setAreas: (areas) => set({ selectedAreas: areas }),
  addMessage: (msg: ChatMessage) => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  setFinalPayload: (payload: any) => set({
    finalCategories: payload.categories,
    suggestedActivities: payload.suggestedActivities,
    coachTone: payload.coachTone,
    summary: payload.summary,
  }),
}));

export interface AppState {
  isBooted: boolean;
  onboardingComplete: boolean;
  activities: ActivityBlockView[];
  momentumSummaries: MomentumSummary[];
  coachBannerMsg: string;
  setBooted: (val: boolean) => void;
  setOnboardingComplete: (val: boolean) => void;
  loadAll: () => Promise<void>;
  refreshSchedule: () => void;
}

import { activityRepo, chatRepo } from '../db/repositories';
import { aiService } from '../services/ai/aiService';

export const useAppStore = create<AppState>((set) => ({
  isBooted: false,
  onboardingComplete: false,
  activities: [],
  momentumSummaries: [],
  coachBannerMsg: 'Loading pulse...',
  setBooted: (val) => set({ isBooted: val }),
  setOnboardingComplete: (val) => set({ onboardingComplete: val }),
  loadAll: async () => {
    try {
      const blocks = activityRepo.getTodaysBlocks();
      const scores = activityRepo.getMomentumSummaries();
      const banner = await aiService.generateMorningBriefing();

      set({ activities: blocks, momentumSummaries: scores, coachBannerMsg: banner });
    } catch(e) {
      console.error('[App Store]', e);
    }
  },
  refreshSchedule: () => {
    try {
      const blocks = activityRepo.getTodaysBlocks();
      const scores = activityRepo.getMomentumSummaries();
      set({ activities: blocks, momentumSummaries: scores });
    } catch (e) {
      console.error('[App Store] Failed to refresh schedule', e);
    }
  },
}));

export interface ChatState {
  messages: ChatMessage[];
  hydrated: boolean;
  hydrate: () => void;
  addMessage: (msg: ChatMessage) => ChatMessage;
  setMessages: (messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  hydrated: false,
  hydrate: () => set({ messages: chatRepo.getAll(), hydrated: true }),
  addMessage: (msg) => {
    const created = chatRepo.create(msg);
    set((state) => ({ messages: [...state.messages, created] }));
    return created;
  },
  setMessages: (messages) => set({ messages }),
}));
