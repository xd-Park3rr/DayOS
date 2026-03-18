import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) {
    db = SQLite.openDatabaseSync('dayos.db');
  }
  return db;
};

export const runMigrations = () => {
  const database = getDb();

  database.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
  `);

  const v1Migration = `
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      onboarding_complete INTEGER DEFAULT 0,
      coach_tone TEXT DEFAULT 'direct',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS category_config (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      colour TEXT NOT NULL,
      default_severity TEXT NOT NULL,
      identity_anchor TEXT NOT NULL,
      screen_time_allowed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      category_id TEXT REFERENCES category_config(id),
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      identity_anchor TEXT NOT NULL,
      real_cost_message TEXT NOT NULL,
      recurrence TEXT DEFAULT 'weekly',
      recurrence_days TEXT,
      window_minutes INTEGER DEFAULT 60,
      default_time TEXT,
      rationalisation_threshold INTEGER DEFAULT 2,
      calendar_event_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      activity_id TEXT REFERENCES activity(id),
      scheduled_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT DEFAULT 'pending',
      skip_reason TEXT,
      rationalisation_flagged INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drift_state (
      id TEXT PRIMARY KEY,
      activity_id TEXT UNIQUE REFERENCES activity(id),
      misses_this_week INTEGER DEFAULT 0,
      misses_this_month INTEGER DEFAULT 0,
      last_completed_at TEXT,
      drift_score INTEGER DEFAULT 0,
      escalation_level INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS consequence_record (
      id TEXT PRIMARY KEY,
      activity_id TEXT REFERENCES activity(id),
      triggered_at TEXT NOT NULL,
      type TEXT NOT NULL,
      message_delivered TEXT NOT NULL,
      user_response TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diary_entry (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      themes TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bluetooth_device_map (
      mac_address TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_activity_id TEXT REFERENCES activity(id),
      target_music_uri TEXT,
      auto_dnd INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sleep_record (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      duration_minutes INTEGER NOT NULL,
      sleep_score INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS context_state (
      id TEXT PRIMARY KEY,
      current_context TEXT NOT NULL,
      active_trigger TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS intent_log (
      id TEXT PRIMARY KEY,
      intent TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      params TEXT,
      executed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `;

  const hasV1 = database.getFirstSync<{id: number}>('SELECT id FROM migrations WHERE name = ?', ['v1Schema']);
  if (!hasV1) {
    database.execSync(v1Migration);
    database.runSync('INSERT INTO migrations (name) VALUES (?)', ['v1Schema']);
  }

  const v2Migration = `
    CREATE TABLE IF NOT EXISTS chat_message (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      source TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      intent TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_message_created_at ON chat_message (created_at);
  `;

  const hasV2 = database.getFirstSync<{id: number}>('SELECT id FROM migrations WHERE name = ?', ['v2ChatHistory']);
  if (!hasV2) {
    database.execSync(v2Migration);
    database.runSync('INSERT INTO migrations (name) VALUES (?)', ['v2ChatHistory']);
  }

  const v3Migration = `
    CREATE TABLE IF NOT EXISTS assistant_setting (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assistant_run (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      summary TEXT NOT NULL,
      autonomy_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assistant_step (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES assistant_run(id),
      step_index INTEGER NOT NULL,
      namespace TEXT NOT NULL,
      command TEXT NOT NULL,
      human_summary TEXT NOT NULL,
      params TEXT NOT NULL,
      depends_on TEXT NOT NULL,
      confirmation_policy TEXT NOT NULL,
      verification_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      evidence TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_assistant_step_run_id ON assistant_step (run_id, step_index);
    CREATE INDEX IF NOT EXISTS idx_assistant_run_created_at ON assistant_run (created_at DESC);

    CREATE TABLE IF NOT EXISTS calendar_event_cache (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      calendar_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      location TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      is_all_day INTEGER DEFAULT 0,
      source TEXT NOT NULL,
      last_synced_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_event_cache_range ON calendar_event_cache (start_at, end_at);

    CREATE TABLE IF NOT EXISTS task_item (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      due_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notification_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_task_item_due_at ON task_item (due_at);

    CREATE TABLE IF NOT EXISTS task_notification (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES task_item(id),
      scheduled_notification_id TEXT UNIQUE,
      scheduled_at TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_block_rule (
      id TEXT PRIMARY KEY,
      package_name TEXT NOT NULL UNIQUE,
      app_label TEXT NOT NULL,
      reason TEXT,
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;

  const hasV3 = database.getFirstSync<{id: number}>('SELECT id FROM migrations WHERE name = ?', ['v3AssistantCommandEngine']);
  if (!hasV3) {
    database.execSync(v3Migration);
    database.runSync('INSERT INTO migrations (name) VALUES (?)', ['v3AssistantCommandEngine']);
  }

  const v4Migration = `
    ALTER TABLE assistant_run ADD COLUMN planner_error_kind TEXT;
    ALTER TABLE assistant_run ADD COLUMN planner_error_message TEXT;
    ALTER TABLE assistant_run ADD COLUMN planner_raw_response TEXT;
    ALTER TABLE assistant_run ADD COLUMN planner_normalized_response TEXT;
    ALTER TABLE assistant_run ADD COLUMN runtime_snapshot TEXT;
  `;

  const hasV4 = database.getFirstSync<{id: number}>('SELECT id FROM migrations WHERE name = ?', ['v4AssistantRunDiagnostics']);
  if (!hasV4) {
    database.execSync(v4Migration);
    database.runSync('INSERT INTO migrations (name) VALUES (?)', ['v4AssistantRunDiagnostics']);
  }
};
