import { describe, it, expect, beforeEach } from 'vitest';
import { ProficiencyProfileService } from './ProficiencyProfileService';
import { StorageRepository } from '../storage/StorageRepository';

describe('ProficiencyProfileService', () => {
  let repository: StorageRepository;
  let service: ProficiencyProfileService;

  beforeEach(() => {
    repository = new StorageRepository('test_profile_db_' + Math.random());
    service = new ProficiencyProfileService(repository);
  });

  it('returns baseline profile when no sessions or unmastered items exist', async () => {
    const profile = await service.getProficiencyProfile('N4');
    expect(profile).toEqual({
      estimatedLevel: 'N4',
      recentStruggles: [],
      recentStrengths: [],
      totalPracticeMinutes: 0,
    });
  });

  it('synthesizes proficiency profile from recent session reports and unmastered notebook items', async () => {
    await repository.updateUserStats({
      dailyStreak: 3,
      lastPracticeDate: '2026-07-12',
      totalMinutesPracticed: 45,
      dailyGoalMinutes: 15,
    });

    await repository.saveSession({
      id: 'sess-1',
      timestamp: Date.now() - 10000,
      durationSeconds: 300,
      personaId: 'casual_friend',
      jlptLevel: 'N4',
      transcript: [],
      feedbackReport: {
        summary: 'Good N3 level vocabulary used.',
        topGrammarCorrections: [],
        naturalPhrasingTips: [],
        estimatedLevel: 'N3',
      },
    });

    await repository.saveNotebookItem({
      id: 'note-1',
      createdAt: Date.now(),
      category: 'grammar',
      jlptLevel: 'N3',
      originalText: '本をよむ時',
      correctedText: '本を読む時に',
      furiganaText: '本(ほん)を読(よ)む時(とき)に',
      explanation: 'Remember the particle ni for time clauses.',
      mastered: false,
    });

    const profile = await service.getProficiencyProfile('N4');
    expect(profile.estimatedLevel).toBe('N3');
    expect(profile.totalPracticeMinutes).toBe(45);
    expect(profile.recentStruggles).toContain('本をよむ時 (Remember the particle ni for time clauses.)');
  });
});
