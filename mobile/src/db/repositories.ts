import { getDb } from './client';
import type {
  Activity,
  ActivityBlockView,
  ActivityLog,
  AppBlockRule,
  AssistantAutonomyMode,
  AssistantRunRecord,
  AssistantRunStatus,
  AssistantRunWithSteps,
  AssistantSetting,
  AssistantStepRecord,
  AssistantStepStatus,
  CalendarEventCacheItem,
  CategoryConfig,
  ConsequenceRecord,
  DiaryEntry,
  DriftState,
  MomentumSummary,
  RecentMomentumBlock,
  Severity,
  TaskItem,
  TaskNotification,
  TaskStatus,
  UserProfile,
  RuntimeCapabilitySnapshot,
} from '../types';
import type { ChatMessage, ChatSource } from '../services/ai/chatTypes';

const MOMENTUM_SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 1.5,
  high: 1.25,
  medium: 1,
  low: 0.75,
};

const MOMENTUM_STATUS_CREDIT: Record<ActivityLog['status'], number> = {
  done: 1,
  deferred: 0.5,
  skipped: 0,
  pending: 0,
};

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseJsonValue = (value: string | null | undefined): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const stringifyJson = (value: unknown): string => JSON.stringify(value ?? null);

const combineDateAndTime = (date: Date, timeValue: string | null | undefined): string | null => {
  if (!timeValue) {
    return null;
  }

  const parsed = new Date(timeValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  const match = timeValue.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const combined = new Date(date);
  combined.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return combined.toISOString();
};

const mapProfile = (row: any): UserProfile => ({
  id: row.id,
  name: row.name,
  onboardingComplete: row.onboarding_complete === 1,
  coachTone: row.coach_tone,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapCategory = (row: any): CategoryConfig => ({
  id: row.id,
  name: row.name,
  colour: row.colour,
  defaultSeverity: row.default_severity,
  identityAnchor: row.identity_anchor,
  screenTimeAllowed: row.screen_time_allowed === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapActivityBlock = (row: any, fallbackDay = new Date()): ActivityBlockView => ({
  logId: row.log_id || null,
  activityId: row.activity_id,
  categoryId: row.category_id || null,
  categoryName: row.category_name || 'Uncategorized',
  categoryColour: row.category_colour || null,
  title: row.title,
  severity: row.severity,
  identityAnchor: row.identity_anchor,
  realCostMessage: row.real_cost_message,
  scheduledAt: combineDateAndTime(fallbackDay, row.scheduled_at || row.default_time),
  defaultTime: row.default_time || null,
  status: row.status || 'pending',
  windowMinutes: row.window_minutes,
  rationalisationThreshold: row.rationalisation_threshold,
  calendarEventId: row.calendar_event_id || null,
  skipReason: row.skip_reason || null,
  completedAt: row.completed_at || null,
});

const mapDriftState = (row: any): DriftState & { categoryName: string } => ({
  id: row.id,
  activityId: row.activity_id,
  missesThisWeek: row.misses_this_week,
  missesThisMonth: row.misses_this_month,
  lastCompletedAt: row.last_completed_at,
  driftScore: row.drift_score,
  escalationLevel: row.escalation_level,
  updatedAt: row.updated_at,
  categoryName: row.category_name,
});

const mapChatMessage = (row: any): ChatMessage => ({
  id: row.id,
  sessionId: row.session_id || null,
  source: row.source as ChatSource,
  role: row.role,
  content: row.content,
  intent: row.intent || null,
  createdAt: row.created_at,
  metadata: parseJsonValue(row.metadata),
});

const createRecentMomentumBlock = (row: any): RecentMomentumBlock => ({
  logId: row.log_id,
  title: row.title,
  scheduledAt: row.scheduled_at,
  status: row.status,
  severity: row.severity,
});

const mapAssistantSetting = (row: any): AssistantSetting => ({
  key: row.key,
  value: row.value,
  updatedAt: row.updated_at,
});

const mapAssistantRun = (row: any): AssistantRunRecord => ({
  id: row.id,
  source: row.source,
  rawText: row.raw_text,
  summary: row.summary,
  autonomyMode: row.autonomy_mode as AssistantAutonomyMode,
  status: row.status as AssistantRunStatus,
  plannerErrorKind: row.planner_error_kind || null,
  plannerErrorMessage: row.planner_error_message || null,
  plannerRawResponse: row.planner_raw_response || null,
  plannerNormalizedResponse: row.planner_normalized_response || null,
  runtimeSnapshot:
    (parseJsonValue(row.runtime_snapshot) as RuntimeCapabilitySnapshot | null) || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAssistantStep = (row: any): AssistantStepRecord => ({
  id: row.id,
  runId: row.run_id,
  stepIndex: row.step_index,
  namespace: row.namespace,
  command: row.command,
  humanSummary: row.human_summary,
  params: parseJsonValue(row.params) || {},
  dependsOn: parseJsonArray(row.depends_on),
  confirmationPolicy: row.confirmation_policy,
  verificationMode: row.verification_mode,
  status: row.status as AssistantStepStatus,
  evidence: parseJsonValue(row.evidence),
  error: row.error || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapCalendarEventCache = (row: any): CalendarEventCacheItem => ({
  id: row.id,
  eventId: row.event_id,
  calendarId: row.calendar_id,
  title: row.title,
  notes: row.notes || null,
  location: row.location || null,
  startAt: row.start_at,
  endAt: row.end_at,
  isAllDay: row.is_all_day === 1,
  source: row.source,
  lastSyncedAt: row.last_synced_at,
});

const mapTaskItem = (row: any): TaskItem => ({
  id: row.id,
  title: row.title,
  notes: row.notes || null,
  dueAt: row.due_at || null,
  status: row.status as TaskStatus,
  notificationId: row.notification_id || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapTaskNotification = (row: any): TaskNotification => ({
  id: row.id,
  taskId: row.task_id,
  scheduledNotificationId: row.scheduled_notification_id || null,
  scheduledAt: row.scheduled_at || null,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAppBlockRule = (row: any): AppBlockRule => ({
  id: row.id,
  packageName: row.package_name,
  appLabel: row.app_label,
  reason: row.reason || null,
  startsAt: row.starts_at || null,
  endsAt: row.ends_at || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const buildMomentumSummary = (rows: any[]): MomentumSummary | null => {
  if (!rows.length) {
    return null;
  }

  let totalWeight = 0;
  let earnedWeight = 0;
  let completedCount = 0;
  let deferredCount = 0;
  let skippedCount = 0;
  let overdueCount = 0;

  const sortedRows = [...rows].sort((a, b) => {
    return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
  });

  sortedRows.forEach((row) => {
    const severity = (row.severity || 'medium') as Severity;
    const weight = MOMENTUM_SEVERITY_WEIGHT[severity] || MOMENTUM_SEVERITY_WEIGHT.medium;
    const status = (row.status || 'pending') as ActivityLog['status'];

    totalWeight += weight;
    earnedWeight += weight * (MOMENTUM_STATUS_CREDIT[status] ?? 0);

    if (status === 'done') {
      completedCount += 1;
    } else if (status === 'deferred') {
      deferredCount += 1;
    } else if (status === 'skipped') {
      skippedCount += 1;
    } else {
      overdueCount += 1;
    }
  });

  return {
    categoryId: rows[0].category_id,
    categoryName: rows[0].category_name,
    categoryColour: rows[0].category_colour || '#c8f27a',
    score: totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0,
    completedCount,
    deferredCount,
    skippedCount,
    overdueCount,
    recentBlocks: sortedRows.slice(0, 5).map(createRecentMomentumBlock),
    totalWeight,
    earnedWeight,
    identityAnchors: Array.from(new Set(sortedRows.map((row) => row.identity_anchor).filter(Boolean))),
  };
};

export const profileRepo = {
  get: (): UserProfile | null => {
    const db = getDb();
    const row = db.getFirstSync('SELECT * FROM user_profile LIMIT 1');
    return row ? mapProfile(row) : null;
  },
  create: (profile: UserProfile): void => {
    const db = getDb();
    db.runSync(
      `INSERT INTO user_profile (id, name, onboarding_complete, coach_tone, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.name,
        profile.onboardingComplete ? 1 : 0,
        profile.coachTone,
        profile.createdAt,
        profile.updatedAt,
      ]
    );
  },
  markOnboardingComplete: (): void => {
    const db = getDb();
    const updated = new Date().toISOString();
    db.runSync(`UPDATE user_profile SET onboarding_complete = 1, updated_at = ?`, [updated]);
  },
};

export const categoryRepo = {
  create: (category: CategoryConfig): void => {
    const db = getDb();
    db.runSync(
      `INSERT INTO category_config 
      (id, name, colour, default_severity, identity_anchor, screen_time_allowed, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        category.name,
        category.colour,
        category.defaultSeverity,
        category.identityAnchor,
        category.screenTimeAllowed ? 1 : 0,
        category.createdAt,
        category.updatedAt,
      ]
    );
  },
  getAll: (): CategoryConfig[] => {
    const db = getDb();
    const rows = db.getAllSync('SELECT * FROM category_config');
    return (rows as any[]).map(mapCategory);
  },
};

export const activityRepo = {
  create: (activity: Activity): void => {
    const db = getDb();
    db.runSync(
      `INSERT INTO activity 
      (id, category_id, title, severity, identity_anchor, real_cost_message, recurrence, recurrence_days, window_minutes, default_time, rationalisation_threshold, calendar_event_id, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activity.id,
        activity.categoryId,
        activity.title,
        activity.severity,
        activity.identityAnchor,
        activity.realCostMessage,
        activity.recurrence,
        activity.recurrenceDays ? JSON.stringify(activity.recurrenceDays) : null,
        activity.windowMinutes,
        activity.defaultTime,
        activity.rationalisationThreshold,
        activity.calendarEventId,
        activity.isActive ? 1 : 0,
        activity.createdAt,
        activity.updatedAt,
      ]
    );
  },

  getTodaysBlocks: (): ActivityBlockView[] => {
    const db = getDb();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const todayRows = db.getAllSync(
      `
       SELECT
         a.id as activity_id,
         a.category_id,
         c.name as category_name,
         c.colour as category_colour,
         a.title,
         a.severity,
         a.identity_anchor,
         a.real_cost_message,
         a.window_minutes,
         a.rationalisation_threshold,
         a.default_time,
         a.calendar_event_id,
         al.id as log_id,
         al.scheduled_at,
         al.status,
         al.skip_reason,
         al.completed_at
       FROM activity a
       LEFT JOIN category_config c ON a.category_id = c.id
       INNER JOIN activity_log al ON al.activity_id = a.id
       WHERE a.is_active = 1 AND al.scheduled_at >= ? AND al.scheduled_at < ?
       ORDER BY al.scheduled_at ASC
    `,
      [start.toISOString(), end.toISOString()]
    );

    if ((todayRows as any[]).length > 0) {
      return (todayRows as any[]).map((row) => mapActivityBlock(row, start));
    }

    const fallbackRows = db.getAllSync(
      `
       SELECT
         a.id as activity_id,
         a.category_id,
         c.name as category_name,
         c.colour as category_colour,
         a.title,
         a.severity,
         a.identity_anchor,
         a.real_cost_message,
         a.window_minutes,
         a.rationalisation_threshold,
         a.default_time,
         a.calendar_event_id,
         NULL as log_id,
         NULL as scheduled_at,
         'pending' as status,
         NULL as skip_reason,
         NULL as completed_at,
         a.recurrence_days
       FROM activity a
       LEFT JOIN category_config c ON a.category_id = c.id
       WHERE a.is_active = 1
       ORDER BY a.default_time ASC
    `
    );

    const todayIndex = start.getDay();
    return (fallbackRows as any[])
      .filter((row) => {
        if (!row.recurrence_days) {
          return true;
        }

        try {
          const parsed = JSON.parse(row.recurrence_days);
          return !Array.isArray(parsed) || parsed.length === 0 || parsed.includes(todayIndex);
        } catch {
          return true;
        }
      })
      .map((row) => mapActivityBlock(row, start));
  },

  getMomentumSummaries: (): MomentumSummary[] => {
    const db = getDb();
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);

    const rows = db.getAllSync(
      `
        SELECT
          c.id as category_id,
          c.name as category_name,
          c.colour as category_colour,
          a.identity_anchor,
          a.title,
          a.severity,
          al.id as log_id,
          al.scheduled_at,
          al.status
        FROM category_config c
        INNER JOIN activity a ON a.category_id = c.id
        INNER JOIN activity_log al ON al.activity_id = a.id
        WHERE al.scheduled_at >= ? AND al.scheduled_at <= ?
        ORDER BY c.name ASC, al.scheduled_at DESC
      `,
      [start.toISOString(), now.toISOString()]
    ) as any[];

    const grouped = new Map<string, any[]>();
    rows.forEach((row) => {
      if (!grouped.has(row.category_id)) {
        grouped.set(row.category_id, []);
      }
      grouped.get(row.category_id)!.push(row);
    });

    return Array.from(grouped.values())
      .map((groupRows) => buildMomentumSummary(groupRows))
      .filter((summary): summary is MomentumSummary => !!summary)
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  },

  getMomentumSummary: (categoryId: string): MomentumSummary | null => {
    const summaries = activityRepo.getMomentumSummaries();
    return summaries.find((summary) => summary.categoryId === categoryId) || null;
  },

  updateLogStatus: (logId: string, status: ActivityLog['status'], skipReason?: string): void => {
    const db = getDb();
    const completedAt = status === 'done' ? new Date().toISOString() : null;
    db.runSync(
      `UPDATE activity_log
       SET status = ?, skip_reason = ?, completed_at = ?
       WHERE id = ?`,
      [status, status === 'skipped' ? skipReason || null : null, completedAt, logId]
    );
  },

  updateLogSchedule: (logId: string, scheduledAt: string): void => {
    const db = getDb();
    db.runSync(
      `UPDATE activity_log
       SET scheduled_at = ?, status = 'pending', skip_reason = NULL, completed_at = NULL
       WHERE id = ?`,
      [scheduledAt, logId]
    );
  },
};

export const driftRepo = {
  recordMiss: (activityId: string): void => {
    const db = getDb();
    const now = new Date().toISOString();
    db.runSync(
      `UPDATE drift_state 
       SET misses_this_week = misses_this_week + 1, 
           misses_this_month = misses_this_month + 1,
           drift_score = MIN(100, drift_score + 15),
           escalation_level = CASE 
             WHEN misses_this_week + 1 >= 3 THEN 3 
             WHEN misses_this_week + 1 == 2 THEN 2 
             ELSE 1 END,
           updated_at = ?
       WHERE activity_id = ?`,
      [now, activityId]
    );
  },
  getSummary: (): Array<DriftState & { categoryName: string }> => {
    const db = getDb();
    const rows = db.getAllSync(
      `
        SELECT
          d.*,
          c.name as category_name
        FROM drift_state d
        LEFT JOIN activity a ON a.id = d.activity_id
        LEFT JOIN category_config c ON c.id = a.category_id
        ORDER BY d.updated_at DESC
      `
    );
    return (rows as any[]).map(mapDriftState);
  },
};

export const diaryRepo = {
  getRecentThemes: (): string[] => {
    const db = getDb();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const rows = db.getAllSync(`SELECT themes FROM diary_entry WHERE created_at >= ?`, [
      sevenDaysAgo.toISOString(),
    ]);
    const allThemes: string[] = [];

    (rows as any[]).forEach((row) => {
      allThemes.push(...parseJsonArray(row.themes));
    });

    return Array.from(new Set(allThemes));
  },
};

export const consequenceRepo = {
  create: (record: ConsequenceRecord): void => {
    const db = getDb();
    db.runSync(
      `INSERT INTO consequence_record (id, activity_id, triggered_at, type, message_delivered, user_response, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.activityId,
        record.triggeredAt,
        record.type,
        record.messageDelivered,
        record.userResponse,
        record.createdAt,
      ]
    );
  },
};

export const chatRepo = {
  getAll: (): ChatMessage[] => {
    const db = getDb();
    const rows = db.getAllSync('SELECT * FROM chat_message ORDER BY created_at ASC');
    return (rows as any[]).map(mapChatMessage);
  },

  getRecent: (limit = 20): ChatMessage[] => {
    const db = getDb();
    const rows = db.getAllSync(
      'SELECT * FROM chat_message ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return (rows as any[]).reverse().map(mapChatMessage);
  },

  create: (message: ChatMessage): ChatMessage => {
    const db = getDb();
    const id = message.id || generateId('chat');
    const sessionId = message.sessionId || null;
    const source: ChatSource = message.source || 'typed';
    const content =
      typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);
    const intent = message.intent || null;
    const createdAt = message.createdAt || new Date().toISOString();
    const metadata = message.metadata ? JSON.stringify(message.metadata) : null;
    const normalized: ChatMessage = {
      id,
      sessionId,
      source,
      role: message.role,
      content,
      intent,
      createdAt,
      metadata: message.metadata || null,
    };

    db.runSync(
      `INSERT INTO chat_message (id, session_id, source, role, content, intent, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sessionId,
        source,
        normalized.role,
        content,
        intent,
        metadata,
        createdAt,
      ]
    );

    return normalized;
  },
};

export const assistantSettingRepo = {
  get: (key: string): AssistantSetting | null => {
    const db = getDb();
    const row = db.getFirstSync('SELECT * FROM assistant_setting WHERE key = ?', [key]);
    return row ? mapAssistantSetting(row) : null;
  },

  set: (key: string, value: string): AssistantSetting => {
    const db = getDb();
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO assistant_setting (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, now]
    );

    return {
      key,
      value,
      updatedAt: now,
    };
  },

  getAutonomyMode: (): AssistantAutonomyMode => {
    const row = assistantSettingRepo.get('assistant.autonomy_mode');
    return row?.value === 'auto_everything' ? 'auto_everything' : 'safe_auto';
  },

  setAutonomyMode: (value: AssistantAutonomyMode): AssistantSetting => {
    return assistantSettingRepo.set('assistant.autonomy_mode', value);
  },
};

export const assistantRunRepo = {
  create: (run: AssistantRunRecord): AssistantRunRecord => {
    const db = getDb();
    db.runSync(
      `INSERT INTO assistant_run
       (id, source, raw_text, summary, autonomy_mode, status, planner_error_kind, planner_error_message, planner_raw_response, planner_normalized_response, runtime_snapshot, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.source,
        run.rawText,
        run.summary,
        run.autonomyMode,
        run.status,
        run.plannerErrorKind || null,
        run.plannerErrorMessage || null,
        run.plannerRawResponse || null,
        run.plannerNormalizedResponse || null,
        run.runtimeSnapshot ? stringifyJson(run.runtimeSnapshot) : null,
        run.createdAt,
        run.updatedAt,
      ]
    );
    return run;
  },

  updateStatus: (id: string, status: AssistantRunStatus): void => {
    const db = getDb();
    db.runSync(
      `UPDATE assistant_run
       SET status = ?, updated_at = ?
       WHERE id = ?`,
      [status, new Date().toISOString(), id]
    );
  },

  getById: (id: string): AssistantRunRecord | null => {
    const db = getDb();
    const row = db.getFirstSync('SELECT * FROM assistant_run WHERE id = ?', [id]);
    return row ? mapAssistantRun(row) : null;
  },

  getRecent: (limit = 10): AssistantRunWithSteps[] => {
    const db = getDb();
    const rows = db.getAllSync(
      `SELECT * FROM assistant_run ORDER BY created_at DESC LIMIT ?`,
      [limit]
    ) as any[];

    return rows.map((row) => ({
      ...mapAssistantRun(row),
      steps: assistantStepRepo.getByRunId(row.id),
    }));
  },

  getPendingConfirmation: (): AssistantRunWithSteps | null => {
    const db = getDb();
    const row = db.getFirstSync(
      `SELECT * FROM assistant_run WHERE status = 'awaiting_confirmation' ORDER BY created_at DESC LIMIT 1`
    );
    if (!row) {
      return null;
    }

    const mapped = mapAssistantRun(row);
    return {
      ...mapped,
      steps: assistantStepRepo.getByRunId(mapped.id),
    };
  },
};

export const assistantStepRepo = {
  createMany: (steps: AssistantStepRecord[]): void => {
    const db = getDb();
    steps.forEach((step) => {
      db.runSync(
        `INSERT INTO assistant_step
         (id, run_id, step_index, namespace, command, human_summary, params, depends_on, confirmation_policy, verification_mode, status, evidence, error, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          step.id,
          step.runId,
          step.stepIndex,
          step.namespace,
          step.command,
          step.humanSummary,
          stringifyJson(step.params),
          stringifyJson(step.dependsOn),
          step.confirmationPolicy,
          step.verificationMode,
          step.status,
          step.evidence ? stringifyJson(step.evidence) : null,
          step.error,
          step.createdAt,
          step.updatedAt,
        ]
      );
    });
  },

  updateResult: (
    id: string,
    status: AssistantStepStatus,
    evidence: Record<string, unknown> | null,
    error: string | null
  ): void => {
    const db = getDb();
    db.runSync(
      `UPDATE assistant_step
       SET status = ?, evidence = ?, error = ?, updated_at = ?
       WHERE id = ?`,
      [
        status,
        evidence ? stringifyJson(evidence) : null,
        error,
        new Date().toISOString(),
        id,
      ]
    );
  },

  getByRunId: (runId: string): AssistantStepRecord[] => {
    const db = getDb();
    const rows = db.getAllSync(
      `SELECT * FROM assistant_step WHERE run_id = ? ORDER BY step_index ASC`,
      [runId]
    );
    return (rows as any[]).map(mapAssistantStep);
  },

  getById: (id: string): AssistantStepRecord | null => {
    const db = getDb();
    const row = db.getFirstSync('SELECT * FROM assistant_step WHERE id = ?', [id]);
    return row ? mapAssistantStep(row) : null;
  },
};

export const calendarCacheRepo = {
  upsertMany: (items: CalendarEventCacheItem[]): void => {
    const db = getDb();
    items.forEach((item) => {
      db.runSync(
        `INSERT INTO calendar_event_cache
         (id, event_id, calendar_id, title, notes, location, start_at, end_at, is_all_day, source, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(event_id) DO UPDATE SET
           calendar_id = excluded.calendar_id,
           title = excluded.title,
           notes = excluded.notes,
           location = excluded.location,
           start_at = excluded.start_at,
           end_at = excluded.end_at,
           is_all_day = excluded.is_all_day,
           source = excluded.source,
           last_synced_at = excluded.last_synced_at`,
        [
          item.id,
          item.eventId,
          item.calendarId,
          item.title,
          item.notes,
          item.location,
          item.startAt,
          item.endAt,
          item.isAllDay ? 1 : 0,
          item.source,
          item.lastSyncedAt,
        ]
      );
    });
  },

  replaceWindow: (startAt: string, endAt: string, items: CalendarEventCacheItem[]): void => {
    const db = getDb();
    db.runSync(
      `DELETE FROM calendar_event_cache WHERE start_at >= ? AND end_at <= ?`,
      [startAt, endAt]
    );
    calendarCacheRepo.upsertMany(items);
  },

  listRange: (startAt: string, endAt: string): CalendarEventCacheItem[] => {
    const db = getDb();
    const rows = db.getAllSync(
      `SELECT * FROM calendar_event_cache
       WHERE end_at >= ? AND start_at <= ?
       ORDER BY start_at ASC`,
      [startAt, endAt]
    );
    return (rows as any[]).map(mapCalendarEventCache);
  },

  getByEventId: (eventId: string): CalendarEventCacheItem | null => {
    const db = getDb();
    const row = db.getFirstSync(
      'SELECT * FROM calendar_event_cache WHERE event_id = ?',
      [eventId]
    );
    return row ? mapCalendarEventCache(row) : null;
  },

  removeByEventId: (eventId: string): void => {
    const db = getDb();
    db.runSync('DELETE FROM calendar_event_cache WHERE event_id = ?', [eventId]);
  },
};

export const taskRepo = {
  create: (task: TaskItem): TaskItem => {
    const db = getDb();
    db.runSync(
      `INSERT INTO task_item (id, title, notes, due_at, status, notification_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        task.notes,
        task.dueAt,
        task.status,
        task.notificationId,
        task.createdAt,
        task.updatedAt,
      ]
    );
    return task;
  },

  update: (task: TaskItem): TaskItem => {
    const db = getDb();
    db.runSync(
      `UPDATE task_item
       SET title = ?, notes = ?, due_at = ?, status = ?, notification_id = ?, updated_at = ?
       WHERE id = ?`,
      [
        task.title,
        task.notes,
        task.dueAt,
        task.status,
        task.notificationId,
        task.updatedAt,
        task.id,
      ]
    );
    return task;
  },

  delete: (taskId: string): void => {
    const db = getDb();
    db.runSync('DELETE FROM task_item WHERE id = ?', [taskId]);
    db.runSync('DELETE FROM task_notification WHERE task_id = ?', [taskId]);
  },

  getById: (taskId: string): TaskItem | null => {
    const db = getDb();
    const row = db.getFirstSync('SELECT * FROM task_item WHERE id = ?', [taskId]);
    return row ? mapTaskItem(row) : null;
  },

  query: (options?: { search?: string; status?: TaskStatus; startAt?: string; endAt?: string }): TaskItem[] => {
    const db = getDb();
    const clauses = ['1 = 1'];
    const params: Array<string> = [];

    if (options?.search) {
      clauses.push('(LOWER(title) LIKE ? OR LOWER(COALESCE(notes, \'\')) LIKE ?)');
      const value = `%${options.search.toLowerCase()}%`;
      params.push(value, value);
    }

    if (options?.status) {
      clauses.push('status = ?');
      params.push(options.status);
    }

    if (options?.startAt) {
      clauses.push('COALESCE(due_at, created_at) >= ?');
      params.push(options.startAt);
    }

    if (options?.endAt) {
      clauses.push('COALESCE(due_at, created_at) <= ?');
      params.push(options.endAt);
    }

    const rows = db.getAllSync(
      `SELECT * FROM task_item WHERE ${clauses.join(' AND ')} ORDER BY COALESCE(due_at, created_at) ASC`,
      params
    );
    return (rows as any[]).map(mapTaskItem);
  },
};

export const taskNotificationRepo = {
  upsert: (notification: TaskNotification): TaskNotification => {
    const db = getDb();
    db.runSync(
      `INSERT INTO task_notification
       (id, task_id, scheduled_notification_id, scheduled_at, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         scheduled_notification_id = excluded.scheduled_notification_id,
         scheduled_at = excluded.scheduled_at,
         status = excluded.status,
         updated_at = excluded.updated_at`,
      [
        notification.id,
        notification.taskId,
        notification.scheduledNotificationId,
        notification.scheduledAt,
        notification.status,
        notification.createdAt,
        notification.updatedAt,
      ]
    );
    return notification;
  },

  getByTaskId: (taskId: string): TaskNotification | null => {
    const db = getDb();
    const row = db.getFirstSync('SELECT * FROM task_notification WHERE task_id = ?', [taskId]);
    return row ? mapTaskNotification(row) : null;
  },
};

export const appBlockRuleRepo = {
  upsert: (rule: AppBlockRule): AppBlockRule => {
    const db = getDb();
    db.runSync(
      `INSERT INTO app_block_rule
       (id, package_name, app_label, reason, starts_at, ends_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(package_name) DO UPDATE SET
         app_label = excluded.app_label,
         reason = excluded.reason,
         starts_at = excluded.starts_at,
         ends_at = excluded.ends_at,
         updated_at = excluded.updated_at`,
      [
        rule.id,
        rule.packageName,
        rule.appLabel,
        rule.reason,
        rule.startsAt,
        rule.endsAt,
        rule.createdAt,
        rule.updatedAt,
      ]
    );
    return rule;
  },

  removeByPackageName: (packageName: string): void => {
    const db = getDb();
    db.runSync('DELETE FROM app_block_rule WHERE package_name = ?', [packageName]);
  },

  getByPackageName: (packageName: string): AppBlockRule | null => {
    const db = getDb();
    const row = db.getFirstSync(
      'SELECT * FROM app_block_rule WHERE package_name = ?',
      [packageName]
    );
    return row ? mapAppBlockRule(row) : null;
  },

  getAll: (): AppBlockRule[] => {
    const db = getDb();
    const rows = db.getAllSync(
      'SELECT * FROM app_block_rule ORDER BY updated_at DESC'
    );
    return (rows as any[]).map(mapAppBlockRule);
  },
};

export const repoUtils = {
  createId: (prefix: string): string => generateId(prefix),
};
