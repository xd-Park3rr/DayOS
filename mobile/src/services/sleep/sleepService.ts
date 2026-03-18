import { getDb } from '../../db/client';

export interface SleepData {
  durationMinutes: number;
  sleepScore: number;
}

export const sleepService = {
  getLastNightSleep: async (): Promise<SleepData | null> => {
    try {
      // In a full production build, this would interface with Health Connect / HealthKit.
      // For now, we simulate pulling the last record or mocking if none exists.
      
      const db = getDb();
      const today = new Date().toISOString().split('T')[0];
      
      const row = db.getFirstSync<{duration_minutes: number, sleep_score: number}>(
        'SELECT duration_minutes, sleep_score FROM sleep_record WHERE date = ?',
        [today]
      );

      if (row) {
        return {
          durationMinutes: row.duration_minutes,
          sleepScore: row.sleep_score
        };
      }

      // Simulated fallback for demo/testing
      const mockScore = Math.floor(Math.random() * 30) + 70; // 70-100
      const mockDuration = Math.floor(Math.random() * 120) + 360; // 6-8 hours
      
      // Save it
      db.runSync(
        `INSERT INTO sleep_record (id, date, duration_minutes, sleep_score, created_at) VALUES (?, ?, ?, ?, ?)`,
        [`sleep-${Date.now()}`, today, mockDuration, mockScore, new Date().toISOString()]
      );

      return {
        durationMinutes: mockDuration,
        sleepScore: mockScore
      };

    } catch (e) {
      console.error('[SleepService] Failed to fetch sleep data', e);
      return null;
    }
  }
};
