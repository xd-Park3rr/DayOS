export type CoachTone = 'direct' | 'firm' | 'supportive';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'custom';
export type ActivityStatus = 'pending' | 'done' | 'skipped' | 'deferred';
export type ConsequenceType = 'mirror' | 'drift' | 'replan';
export type UserResponse = 'pending' | 'acknowledged' | 'dismissed' | 'snoozed';
export type TaskStatus = 'pending' | 'completed';
export type AssistantAutonomyMode = 'safe_auto' | 'auto_everything';
export type AssistantRunStatus =
  | 'pending'
  | 'completed'
  | 'partial'
  | 'awaiting_confirmation'
  | 'failed'
  | 'cancelled';
export type AssistantStepStatus =
  | 'pending'
  | 'verified'
  | 'failed'
  | 'needs_confirmation'
  | 'blocked_by_permission'
  | 'skipped_dependency'
  | 'unverified'
  | 'cancelled';
export type JarvisSessionState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'acting'
  | 'speaking';

export interface UserProfile {
  id: string;
  name: string;
  onboardingComplete: boolean;
  coachTone: CoachTone;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export interface CategoryConfig {
  id: string;
  name: string;
  colour: string; // hex color
  defaultSeverity: Severity;
  identityAnchor: string;
  screenTimeAllowed: boolean; // mapped from INTEGER
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  categoryId: string;
  title: string;
  severity: Severity;
  identityAnchor: string;
  realCostMessage: string;
  recurrence: RecurrenceType;
  recurrenceDays: number[] | null; // e.g. [1,3,5]
  windowMinutes: number;
  defaultTime: string | null; // HH:MM
  rationalisationThreshold: number;
  calendarEventId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  activityId: string;
  scheduledAt: string; // ISO datetime
  completedAt: string | null;
  status: ActivityStatus;
  skipReason: string | null;
  rationalisationFlagged: boolean;
  createdAt: string;
}

export interface DriftState {
  id: string;
  activityId: string;
  missesThisWeek: number;
  missesThisMonth: number;
  lastCompletedAt: string | null;
  driftScore: number; // 0-100
  escalationLevel: 1 | 2 | 3;
  updatedAt: string;
}

export interface ConsequenceRecord {
  id: string;
  activityId: string;
  triggeredAt: string;
  type: ConsequenceType;
  messageDelivered: string;
  userResponse: UserResponse;
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  content: string; // encrypted, never sent to AI
  themes: string[]; // JSON string in db, string[] here
  createdAt: string;
}

export interface ActivityBlockView {
  logId: string | null;
  activityId: string;
  categoryId: string | null;
  categoryName: string;
  categoryColour: string | null;
  title: string;
  severity: Severity;
  identityAnchor: string;
  realCostMessage: string;
  scheduledAt: string | null;
  defaultTime: string | null;
  status: ActivityStatus;
  windowMinutes: number;
  rationalisationThreshold: number;
  calendarEventId: string | null;
  skipReason: string | null;
  completedAt: string | null;
}

export interface RecentMomentumBlock {
  logId: string;
  title: string;
  scheduledAt: string;
  status: ActivityStatus;
  severity: Severity;
}

export interface MomentumSummary {
  categoryId: string;
  categoryName: string;
  categoryColour: string;
  score: number;
  completedCount: number;
  deferredCount: number;
  skippedCount: number;
  overdueCount: number;
  recentBlocks: RecentMomentumBlock[];
  totalWeight: number;
  earnedWeight: number;
  identityAnchors: string[];
}

export interface TaskItem {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  status: TaskStatus;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskNotification {
  id: string;
  taskId: string;
  scheduledNotificationId: string | null;
  scheduledAt: string | null;
  status: 'scheduled' | 'cancelled' | 'fired';
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventCacheItem {
  id: string;
  eventId: string;
  calendarId: string;
  title: string;
  notes: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  source: string;
  lastSyncedAt: string;
}

export interface AppBlockRule {
  id: string;
  packageName: string;
  appLabel: string;
  reason: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface AssistantStepRecord {
  id: string;
  runId: string;
  stepIndex: number;
  namespace: string;
  command: string;
  humanSummary: string;
  params: Record<string, unknown>;
  dependsOn: string[];
  confirmationPolicy: string;
  verificationMode: string;
  status: AssistantStepStatus;
  evidence: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantRunRecord {
  id: string;
  source: 'typed' | 'voice';
  rawText: string;
  summary: string;
  autonomyMode: AssistantAutonomyMode;
  status: AssistantRunStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantRunWithSteps extends AssistantRunRecord {
  steps: AssistantStepRecord[];
}
