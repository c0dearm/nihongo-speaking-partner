import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardView } from './DashboardView';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SettingsProvider } from '../../context/SettingsContext';

describe('DashboardView', () => {
  let repository: StorageRepository;

  beforeEach(() => {
    repository = new StorageRepository('test_dashboard_db_' + Math.random());
    vi.clearAllMocks();
  });

  it('renders streak tracker and calculates roleplay missions completed plus mission success rate', async () => {
    await repository.updateUserStats({
      dailyStreak: 4,
      lastPracticeDate: new Date().toISOString().slice(0, 10),
      totalMinutesPracticed: 65,
      dailyGoalMinutes: 20,
    });

    await repository.saveSession({
      id: 'sess-mission-1',
      timestamp: Date.now() - 20000,
      durationSeconds: 300,
      personaId: 'casual_friend',
      jlptLevel: 'N4',
      transcript: [],
      feedbackReport: {
        summary: 'Good izakaya reservation call.',
        topGrammarCorrections: [],
        naturalPhrasingTips: [],
        estimatedLevel: 'N4',
        goalVerdict: { status: 'ACHIEVED', analysis: 'Successfully booked the table.' },
      },
    });

    await repository.saveSession({
      id: 'sess-mission-2',
      timestamp: Date.now() - 10000,
      durationSeconds: 240,
      personaId: 'casual_friend',
      jlptLevel: 'N4',
      transcript: [],
      feedbackReport: {
        summary: 'Struggled with train ticket purchase.',
        topGrammarCorrections: [],
        naturalPhrasingTips: [],
        estimatedLevel: 'N4',
        goalVerdict: { status: 'MISSED', analysis: 'Did not specify departure time.' },
      },
    });

    render(
      <SettingsProvider>
        <DashboardView repository={repository} />
      </SettingsProvider>
    );

    expect(await screen.findByText(/4 days/i)).toBeInTheDocument();
    expect(screen.getByText(/Roleplay Missions/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 total missions
    expect(screen.getByText(/Mission Success Rate/i)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // 1/2 achieved = 50%
  });

  it('counts sessions with scenarioId in missionSessions even if feedbackReport is missing', async () => {
    await repository.saveSession({
      id: 'sess-mission-scenario-only',
      timestamp: Date.now() - 5000,
      durationSeconds: 120,
      personaId: 'casual_friend',
      jlptLevel: 'N4',
      transcript: [],
      scenarioId: 'izakaya_reserve',
      scenarioTitle: 'Izakaya Table Reservation',
    });

    render(
      <SettingsProvider>
        <DashboardView repository={repository} />
      </SettingsProvider>
    );

    expect(await screen.findByText(/Roleplay Missions/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

