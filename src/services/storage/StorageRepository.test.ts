import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageRepository } from './StorageRepository';
import {
  NotebookItemRecord,
  UserStatsRecord,
  SessionRecord,
  DrillProgressRecord,
  DrillPrompt,
  ExportDataPayload,
} from '../../types';

describe('StorageRepository', () => {
  let repo: StorageRepository;

  beforeEach(async () => {
    repo = new StorageRepository('test_nihongo_db_' + Math.random());
    await repo.init();
  });

  it('saves and retrieves notebook items in descending order of createdAt', async () => {
    const item1: NotebookItemRecord = {
      id: 'note-1',
      createdAt: 1720630000000,
      category: 'grammar',
      jlptLevel: 'N4',
      originalText: '遅れてごめんなさい',
      correctedText: '遅れて申し訳ありません',
      furiganaText: 'おくれてもうしわけありません',
      explanation: 'More polite phrasing for workplace situations',
      mastered: false,
    };
    const item2: NotebookItemRecord = {
      id: 'note-2',
      createdAt: 1720631000000,
      category: 'vocabulary',
      jlptLevel: 'N3',
      originalText: '食べる',
      correctedText: '召し上がる',
      furiganaText: 'めしあがる',
      explanation: 'Honorific form of taberu',
      mastered: true,
    };

    await repo.saveNotebookItem(item1);
    await repo.saveNotebookItem(item2);
    const items = await repo.getNotebookItems();

    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('note-2'); // More recent first
    expect(items[1].id).toBe('note-1');
  });

  it('deletes a notebook item by id', async () => {
    const item: NotebookItemRecord = {
      id: 'note-to-delete',
      createdAt: 1720630000000,
      category: 'grammar',
      jlptLevel: 'N4',
      originalText: '遅れてごめんなさい',
      correctedText: '遅れて申し訳ありません',
      furiganaText: 'おくれてもうしわけありません',
      explanation: 'More polite phrasing',
      mastered: false,
    };

    await repo.saveNotebookItem(item);
    expect(await repo.getNotebookItems()).toHaveLength(1);

    await repo.deleteNotebookItem('note-to-delete');
    expect(await repo.getNotebookItems()).toHaveLength(0);
  });

  it('initializes and updates user stats', async () => {
    const stats = await repo.getUserStats();
    expect(stats.dailyStreak).toBe(0);
    expect(stats.dailyGoalMinutes).toBe(15);

    const updated: UserStatsRecord = {
      ...stats,
      dailyStreak: 3,
      totalMinutesPracticed: 45,
    };
    await repo.updateUserStats(updated);

    const fresh = await repo.getUserStats();
    expect(fresh.dailyStreak).toBe(3);
    expect(fresh.totalMinutesPracticed).toBe(45);
  });

  it('saves and retrieves sessions sorted by timestamp descending', async () => {
    const s1: SessionRecord = {
      id: 'sess-1',
      timestamp: 1000,
      durationSeconds: 120,
      personaId: 'casual_friend',
      jlptLevel: 'N5',
      transcript: [],
    };
    const s2: SessionRecord = {
      id: 'sess-2',
      timestamp: 2000,
      durationSeconds: 180,
      personaId: 'izakaya_staff',
      jlptLevel: 'N4',
      transcript: [],
    };

    await repo.saveSession(s1);
    await repo.saveSession(s2);

    const sessions = await repo.getSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe('sess-2');
    expect(sessions[1].id).toBe('sess-1');
  });

  it('saves and retrieves drill progress sorted by completedAt descending', async () => {
    const p1: DrillProgressRecord = {
      id: 'prog-1',
      drillId: 'drill-1',
      jlptLevel: 'N5',
      completedAt: 1000,
      assessment: {
        overallScore: 80,
        grammarScore: 80,
        naturalnessScore: 80,
        userTranscript: 'テスト',
        nativeRecast: { japanese: 'テスト', furigana: 'てすと', english: 'test' },
        grammarCorrections: [],
        keyVocabulary: [],
      },
    };
    const p2: DrillProgressRecord = {
      id: 'prog-2',
      drillId: 'drill-2',
      jlptLevel: 'N4',
      completedAt: 2000,
      assessment: {
        overallScore: 90,
        grammarScore: 90,
        naturalnessScore: 90,
        userTranscript: 'テスト２',
        nativeRecast: { japanese: 'テスト２', furigana: 'てすと２', english: 'test 2' },
        grammarCorrections: [],
        keyVocabulary: [],
      },
    };

    await repo.saveDrillProgress(p1);
    await repo.saveDrillProgress(p2);

    const list = await repo.getDrillProgressList();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('prog-2');
    expect(list[1].id).toBe('prog-1');
  });

  it('saves and retrieves custom drills', async () => {
    const drill: DrillPrompt = {
      id: 'custom-1',
      jlptLevel: 'N3',
      category: 'scenario',
      title: 'Custom Drill',
      promptText: 'Practice ordering',
      targetGrammar: '〜お願いします',
      isCustom: true,
    };

    await repo.saveCustomDrill(drill);
    const drills = await repo.getCustomDrills();

    expect(drills).toHaveLength(1);
    expect(drills[0].id).toBe('custom-1');
  });

  it('exports and imports all data accurately', async () => {
    const session: SessionRecord = {
      id: 'sess-export',
      timestamp: 1000,
      durationSeconds: 60,
      personaId: 'jlpt_tutor',
      jlptLevel: 'N3',
      transcript: [],
    };
    const drillProgress: DrillProgressRecord = {
      id: 'prog-export',
      drillId: 'drill-exp',
      jlptLevel: 'N3',
      completedAt: 1000,
      assessment: {
        overallScore: 85,
        grammarScore: 85,
        naturalnessScore: 85,
        userTranscript: 'テスト',
        nativeRecast: { japanese: 'テスト', furigana: 'てすと', english: 'test' },
        grammarCorrections: [],
        keyVocabulary: [],
      },
    };
    const notebookItem: NotebookItemRecord = {
      id: 'note-export',
      createdAt: 1000,
      category: 'pronunciation',
      jlptLevel: 'N3',
      originalText: 'きょう',
      correctedText: 'きょう',
      furiganaText: 'きょう',
      explanation: 'pitch accent',
      mastered: false,
    };
    const customDrill: DrillPrompt = {
      id: 'custom-export',
      jlptLevel: 'N3',
      category: 'shadowing',
      title: 'Export Drill',
      promptText: 'Shadow this',
      targetGrammar: '〜たり〜たり',
      isCustom: true,
    };
    const stats: UserStatsRecord = {
      dailyStreak: 5,
      lastPracticeDate: '2026-07-10',
      totalMinutesPracticed: 100,
      dailyGoalMinutes: 20,
    };

    await repo.saveSession(session);
    await repo.saveDrillProgress(drillProgress);
    await repo.saveNotebookItem(notebookItem);
    await repo.saveCustomDrill(customDrill);
    await repo.updateUserStats(stats);

    const exported: ExportDataPayload = await repo.exportAllData();
    expect(exported.version).toBe(1);
    expect(exported.sessions).toHaveLength(1);
    expect(exported.drillsProgress).toHaveLength(1);
    expect(exported.notebookItems).toHaveLength(1);
    expect(exported.customDrills).toHaveLength(1);
    expect(exported.userStats.dailyStreak).toBe(5);

    // Import into a fresh repo instance
    const repo2 = new StorageRepository('test_nihongo_db_import_' + Math.random());
    await repo2.init();

    await repo2.importAllData(exported);

    expect(await repo2.getSessions()).toEqual([session]);
    expect(await repo2.getDrillProgressList()).toEqual([drillProgress]);
    expect(await repo2.getNotebookItems()).toEqual([notebookItem]);
    expect(await repo2.getCustomDrills()).toEqual([customDrill]);
    expect(await repo2.getUserStats()).toEqual(stats);
  });

  it('clears user history while preserving dailyGoalMinutes and custom scenarios', async () => {
    // 1. Save a session, a notebook item, custom scenario, and update user stats
    await repo.saveSession({
      id: 's-clear-test',
      timestamp: Date.now(),
      durationSeconds: 120,
      turnCount: 4,
      transcript: [],
      scenarioId: 'izakaya_reserve',
    } as any);

    await repo.saveNotebookItem({
      id: 'n-clear-test',
      createdAt: Date.now(),
      category: 'vocabulary',
      jlptLevel: 'N4',
      originalText: '本',
      correctedText: '本',
      explanation: 'Book',
      mastered: false,
    } as any);

    await repo.saveCustomScenario({
      id: 'custom-scen-1',
      title: 'My Custom Mission',
      category: 'dining',
      goalDescription: 'Order coffee.',
      userRole: 'Customer',
      aiRole: 'Barista',
    });

    await repo.saveDrillProgress({
      id: 'dp-1',
      drillId: 'd-1',
      jlptLevel: 'N4',
      completedAt: Date.now(),
      assessment: {
        overallScore: 90,
        grammarScore: 90,
        naturalnessScore: 90,
        userTranscript: 'してはいけません',
        nativeRecast: {
          japanese: 'してはいけません',
          furigana: 'してはいけません',
          english: 'You must not do that.',
        },
        grammarCorrections: [],
        keyVocabulary: [],
      },
    });

    await repo.saveCustomDrill({
      id: 'cd-1',
      title: 'Custom Drill',
      category: 'scenario',
      jlptLevel: 'N4',
      targetGrammar: '〜てはいけません',
      promptText: 'Must not do',
    });

    await repo.updateUserStats({
      dailyStreak: 7,
      lastPracticeDate: '2026-07-12',
      totalMinutesPracticed: 45,
      dailyGoalMinutes: 30, // custom user setting to preserve
    });

    // 2. Execute clearUserHistory
    await repo.clearUserHistory();

    // 3. Verify history stores are cleared
    const sessions = await repo.getSessions();
    expect(sessions).toHaveLength(0);

    const notebookItems = await repo.getNotebookItems();
    expect(notebookItems).toHaveLength(0);

    const drillsProgress = await repo.getDrillProgressList();
    expect(drillsProgress).toHaveLength(0);

    // 4. Verify user stats reset streak/minutes but preserved dailyGoalMinutes
    const stats = await repo.getUserStats();
    expect(stats.dailyStreak).toBe(0);
    expect(stats.totalMinutesPracticed).toBe(0);
    expect(stats.lastPracticeDate).toBe('');
    expect(stats.dailyGoalMinutes).toBe(30);

    // 5. Verify custom scenarios and drills remain untouched
    const scenarios = await repo.getCustomScenarios();
    expect(scenarios.some(s => s.id === 'custom-scen-1')).toBe(true);

    const customDrills = await repo.getCustomDrills();
    expect(customDrills.some(d => d.id === 'cd-1')).toBe(true);
  });

  it('saveSession automatically updates totalMinutesPracticed and dailyStreak for new sessions without double-counting', async () => {
    // 1. Initial user stats
    await repo.updateUserStats({
      dailyStreak: 3,
      lastPracticeDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10), // yesterday
      totalMinutesPracticed: 30,
      dailyGoalMinutes: 15,
    });

    const sessionId = 'session-stats-test-1';
    const turn = { id: 'turn-1', speaker: 'user' as const, text: 'こんにちは', timestamp: Date.now() };

    // 2. Save a new 120-second session (2 minutes)
    await repo.saveSession({
      id: sessionId,
      timestamp: Date.now(),
      durationSeconds: 120,
      personaId: 'casual_friend',
      jlptLevel: 'N4',
      transcript: [turn],
    });

    const stats1 = await repo.getUserStats();
    expect(stats1.totalMinutesPracticed).toBe(32); // 30 + 2
    expect(stats1.dailyStreak).toBe(4); // 3 + 1 because yesterday was last practiced
    expect(stats1.lastPracticeDate).toBe(new Date().toISOString().slice(0, 10));

    // 3. Save the exact same session ID again (e.g. updating with feedback report)
    await repo.saveSession({
      id: sessionId,
      timestamp: Date.now(),
      durationSeconds: 120,
      personaId: 'casual_friend',
      jlptLevel: 'N4',
      transcript: [turn],
      feedbackReport: {
        summary: 'Good job',
        topGrammarCorrections: [],
        naturalPhrasingTips: [],
        estimatedLevel: 'N4',
      },
    });

    const stats2 = await repo.getUserStats();
    expect(stats2.totalMinutesPracticed).toBe(32); // unchanged! No double counting
    expect(stats2.dailyStreak).toBe(4);
  });
});
