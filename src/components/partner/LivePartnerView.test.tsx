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
    localStorage.clear();
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

  it('allows switching to Goal-Oriented Roleplay Missions, selecting a mission, and starting with scenario constraints', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    const modeBtn = screen.getByRole('button', { name: /Goal-Oriented Roleplay Missions/i });
    fireEvent.click(modeBtn);

    const cards = await screen.findAllByText(/Reserving an Izakaya Table/i);
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.click(cards[0]);

    expect(await screen.findByText(/Current Mission Goal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Customer calling the izakaya/i)[0]).toBeInTheDocument();

    const startBtn = screen.getByText(/Start Live Roleplay Mission/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          title: 'Reserving an Izakaya Table',
          goalDescription: expect.stringContaining('Call an izakaya to reserve a table for 5 people'),
        }),
        expect.any(Object),
        expect.any(String)
      );
    });
  });

  it('displays adaptation mode chip in studio and passes profile to LiveAudioClient when in auto mode', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    expect(screen.getByText(/Adaptive Mode: AUTO/i)).toBeInTheDocument();

    const startBtn = screen.getByText(/Start Live Conversation/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        undefined,
        expect.objectContaining({
          estimatedLevel: expect.any(String),
          recentStruggles: expect.any(Array),
        }),
        'auto'
      );
    });

    const endBtn = screen.getByText(/End Conversation/i);
    fireEvent.click(endBtn);

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText(/Adaptive Mode: AUTO/i));
    expect(screen.getByText(/Rigid Mode: STRICT/i)).toBeInTheDocument();
  });

  it('renders adaptation mode chip in slide-out drawer and disables both header and drawer chips when connected', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    // Before connecting, studio header chip should be enabled
    const headerChipBeforeConnect = screen.getByText(/Adaptive Mode: AUTO/i).closest('button')!;
    expect(headerChipBeforeConnect).not.toBeDisabled();

    // Start live conversation (connect)
    const startBtn = screen.getByText(/Start Live Conversation/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
      expect(screen.getByText(/End Conversation/i)).toBeInTheDocument();
    });

    // Verify studio header chip is disabled when connected
    const headerChipConnected = screen.getByText(/Adaptive Mode: AUTO/i).closest('button')!;
    expect(headerChipConnected).toBeDisabled();
    expect(headerChipConnected).toHaveAttribute('title', 'Mode change will apply on next connection');

    // Open slide-out transcript drawer
    fireEvent.click(screen.getByText(/Transcript Drawer/i));
    expect(await screen.findByText(/Live Transcript Drawer/i)).toBeInTheDocument();

    // Verify both header and drawer chips are present and disabled inside the drawer view
    const allChips = screen.getAllByText(/Adaptive Mode: AUTO/i);
    expect(allChips.length).toBeGreaterThanOrEqual(2);

    allChips.forEach((chipEl) => {
      const btn = chipEl.closest('button')!;
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', 'Mode change will apply on next connection');
    });
  });
});

