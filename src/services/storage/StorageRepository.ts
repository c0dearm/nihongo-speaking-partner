import { openDB, IDBPDatabase } from 'idb';
import {
  SessionRecord,
  DrillProgressRecord,
  NotebookItemRecord,
  DrillPrompt,
  UserStatsRecord,
  ExportDataPayload,
} from '../../types';

const DB_VERSION = 1;

export class StorageRepository {
  private dbPromise: Promise<IDBPDatabase>;

  constructor(private dbName = 'nihongo_partner_db') {
    this.dbPromise = this.openDatabase();
  }

  private async openDatabase(): Promise<IDBPDatabase> {
    return openDB(this.dbName, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('drills_progress')) {
          db.createObjectStore('drills_progress', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notebook_items')) {
          db.createObjectStore('notebook_items', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('custom_drills')) {
          db.createObjectStore('custom_drills', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('user_stats')) {
          db.createObjectStore('user_stats');
        }
      },
    });
  }

  async init(): Promise<void> {
    await this.dbPromise;
  }

  // Sessions CRUD
  async saveSession(session: SessionRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('sessions', session);
  }

  async getSessions(): Promise<SessionRecord[]> {
    const db = await this.dbPromise;
    const items = await db.getAll('sessions');
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Drills Progress CRUD
  async saveDrillProgress(progress: DrillProgressRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('drills_progress', progress);
  }

  async getDrillProgressList(): Promise<DrillProgressRecord[]> {
    const db = await this.dbPromise;
    const items = await db.getAll('drills_progress');
    return items.sort((a, b) => b.completedAt - a.completedAt);
  }

  // Custom Drills CRUD
  async saveCustomDrill(drill: DrillPrompt): Promise<void> {
    const db = await this.dbPromise;
    await db.put('custom_drills', drill);
  }

  async getCustomDrills(): Promise<DrillPrompt[]> {
    const db = await this.dbPromise;
    return db.getAll('custom_drills');
  }

  // Notebook CRUD
  async saveNotebookItem(item: NotebookItemRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('notebook_items', item);
  }

  async getNotebookItems(): Promise<NotebookItemRecord[]> {
    const db = await this.dbPromise;
    const items = await db.getAll('notebook_items');
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteNotebookItem(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('notebook_items', id);
  }

  // User Stats
  async getUserStats(): Promise<UserStatsRecord> {
    const db = await this.dbPromise;
    const existing = await db.get('user_stats', 'current');
    if (existing) {
      return existing;
    }
    const defaultStats: UserStatsRecord = {
      dailyStreak: 0,
      lastPracticeDate: '',
      totalMinutesPracticed: 0,
      dailyGoalMinutes: 15,
    };
    await db.put('user_stats', defaultStats, 'current');
    return defaultStats;
  }

  async updateUserStats(stats: UserStatsRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('user_stats', stats, 'current');
  }

  // Export / Import
  async exportAllData(): Promise<ExportDataPayload> {
    const [sessions, drillsProgress, notebookItems, customDrills, userStats] = await Promise.all([
      this.getSessions(),
      this.getDrillProgressList(),
      this.getNotebookItems(),
      this.getCustomDrills(),
      this.getUserStats(),
    ]);

    return {
      version: 1,
      exportedAt: Date.now(),
      sessions,
      drillsProgress,
      notebookItems,
      customDrills,
      userStats,
    };
  }

  async importAllData(data: ExportDataPayload): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(
      ['sessions', 'drills_progress', 'notebook_items', 'custom_drills', 'user_stats'],
      'readwrite'
    );

    await tx.objectStore('sessions').clear();
    for (const s of data.sessions) {
      await tx.objectStore('sessions').put(s);
    }

    await tx.objectStore('drills_progress').clear();
    for (const d of data.drillsProgress) {
      await tx.objectStore('drills_progress').put(d);
    }

    await tx.objectStore('notebook_items').clear();
    for (const n of data.notebookItems) {
      await tx.objectStore('notebook_items').put(n);
    }

    await tx.objectStore('custom_drills').clear();
    for (const c of data.customDrills) {
      await tx.objectStore('custom_drills').put(c);
    }

    await tx.objectStore('user_stats').put(data.userStats, 'current');
    await tx.done;
  }
}
