import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivePartnerView } from './LivePartnerView';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SettingsProvider } from '../../context/SettingsContext';

// Mock LiveAudioClient
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn();
let turnCallback: ((turn: any) => void) | undefined;
const mockOnTurnEvent = vi.fn().mockImplementation((cb) => {
  turnCallback = cb;
});
const mockGetVolumes = vi.fn().mockReturnValue({ inputRms: 0.5, outputRms: 0.3 });

vi.mock('../../services/ai/LiveAudioClient', () => {
  return {
    LiveAudioClient: class {
      connect = mockConnect;
      disconnect = mockDisconnect;
      onTurnEvent = mockOnTurnEvent;
      getVolumes = mockGetVolumes;
    },
  };
});

// Mock EvaluationService
const mockGenerateSessionReport = vi.fn().mockResolvedValue({
  summary: 'Great conversation practice!',
  topGrammarCorrections: [
    {
      originalPart: 'watashi iku',
      correctedPart: 'watashi wa ikimasu',
      explanation: 'Use particle wa and polite form.',
      jlptLevel: 'N4',
    },
  ],
  naturalPhrasingTips: ['Try using sentence-ending particles.'],
  estimatedLevel: 'N4',
});

vi.mock('../../services/ai/EvaluationService', () => {
  return {
    EvaluationService: class {
      generateSessionReport = mockGenerateSessionReport;
    },
  };
});

describe('LivePartnerView', () => {
  const repo = new StorageRepository('test_partner_db_' + Math.random());

  beforeEach(() => {
    vi.clearAllMocks();
    turnCallback = undefined;
    localStorage.setItem('nihongo_api_key', 'test-api-key');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders persona selectors and conversation controls', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );
    expect(await screen.findByText(/Choose Your Conversation Partner/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Live Conversation/i)).toBeInTheDocument();
  });

  it('starts and ends a live conversation when controls are clicked', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    const startBtn = screen.getByText(/Start Live Conversation/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
      expect(screen.getByText(/End Conversation/i)).toBeInTheDocument();
    });

    const endBtn = screen.getByText(/End Conversation/i);
    fireEvent.click(endBtn);

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  it('opens slide-out transcript drawer and allows toggling furigana mode', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    const startBtn = screen.getByText(/Start Live Conversation/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/Transcript Drawer/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Transcript Drawer/i));
    expect(await screen.findByText(/Live Transcript Drawer/i)).toBeInTheDocument();

    const furiganaBtn = screen.getByText(/Furigana ON|Furigana OFF/i);
    fireEvent.click(furiganaBtn);
  });

  it('generates session feedback report modal and adds grammar correction to notebook', async () => {
    const saveNotebookSpy = vi.spyOn(repo, 'saveNotebookItem');

    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    const startBtn = screen.getByText(/Start Live Conversation/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(turnCallback).toBeDefined();
    });

    // Simulate a conversation turn so transcript > 0
    act(() => {
      turnCallback?.({ speaker: 'user', text: 'watashi iku' });
    });

    await waitFor(() => {
      expect(screen.getByText(/Conversation Transcript/i)).toBeInTheDocument();
    });

    const generateBtn = screen.getByText(/Generate Feedback Report/i);
    fireEvent.click(generateBtn);

    expect(await screen.findByText(/Executive Summary/i)).toBeInTheDocument();
    expect(screen.getAllByText('watashi iku').length).toBeGreaterThan(0);
    expect(screen.getAllByText('watashi wa ikimasu').length).toBeGreaterThan(0);

    const addBtn = screen.getAllByText(/Add to Notebook/i)[0];
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(saveNotebookSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          originalText: 'watashi iku',
          correctedText: 'watashi wa ikimasu',
          category: 'grammar',
        })
      );
    });
  });
});
