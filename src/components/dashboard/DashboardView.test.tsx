import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardView } from './DashboardView';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SessionRecord, DrillProgressRecord } from '../../types';

describe('DashboardView', () => {
  it('renders stats dashboard cards with default values', async () => {
    const repo = new StorageRepository('test_dash_db_' + Math.random());
    render(<DashboardView repository={repo} />);
    expect(await screen.findByText(/Daily Speaking Goal/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Practice Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Completed Drills/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg Drill Score/i)).toBeInTheDocument();
    expect(screen.getByText(/No past live partner sessions recorded yet/i)).toBeInTheDocument();
  });

  it('renders populated stats, drill scores, and speaking sessions', async () => {
    const repo = new StorageRepository('test_dash_db_' + Math.random());
    await repo.updateUserStats({
      dailyStreak: 5,
      lastPracticeDate: '2026-07-10',
      totalMinutesPracticed: 20,
      dailyGoalMinutes: 15,
    });

    const session: SessionRecord = {
      id: 'session-1',
      timestamp: Date.now(),
      durationSeconds: 600,
      personaId: 'casual_friend',
      jlptLevel: 'N3',
      transcript: [],
      feedbackReport: {
        summary: 'Great work',
        topGrammarCorrections: [],
        naturalPhrasingTips: [],
        estimatedLevel: 'N3',
      },
    };
    await repo.saveSession(session);

    const drillProgress: DrillProgressRecord = {
      id: 'dp-1',
      drillId: 'drill-1',
      jlptLevel: 'N3',
      completedAt: Date.now(),
      assessment: {
        overallScore: 85,
        grammarScore: 80,
        naturalnessScore: 90,
        userTranscript: 'test',
        nativeRecast: {
          japanese: 'test',
          furigana: 'test',
          english: 'test',
        },
        grammarCorrections: [],
        keyVocabulary: [],
      },
    };
    await repo.saveDrillProgress(drillProgress);

    render(<DashboardView repository={repo} />);

    expect(await screen.findByText('5 Days')).toBeInTheDocument();
    expect(screen.getByText('20 mins')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText(/JLPT N3 Partner Session \(casual_friend\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Est\. Level: N3/i)).toBeInTheDocument();
  });
});
