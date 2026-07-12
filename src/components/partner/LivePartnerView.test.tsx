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

const mockGenerateSpeakingSuggestions = vi.fn().mockImplementation((_transcript, _targetLevel, _apiKey, scenario) => {
  if (!scenario) {
    return Promise.resolve([
      {
        japanese: '最近、どんな映画や音楽に興味がありますか？',
        furigana: '最近[さいきん]、どんな映画[えいが]や音楽[おんがく]に興味[きょうみ]がありますか？',
        english: 'What kind of movies or music are you interested in recently?',
        tip: 'A natural open-ended question to steer the casual conversation.',
      },
      {
        japanese: '週末はいつもどのように過ごしていますか？',
        furigana: '週末[しゅうまつ]はいつもどのように過[す]ごしていますか？',
        english: 'How do you usually spend your weekends?',
        tip: 'Ask about daily routines or hobbies to keep the conversation flowing smoothly.',
      },
    ]);
  }
  return Promise.resolve([
    {
      japanese: 'すみません、土曜日の夜７時に５人で予約したいのですが。',
      furigana: 'すみません、土曜日[どようび]の夜[よる]７時[しちじ]に５人[ごにん]で予約[よやく]したいのですが。',
      english: 'Excuse me, I would like to make a reservation for 5 people on Saturday evening at 7.',
      tip: 'A polite, natural sentence using ~たいのですが to clearly state your reservation request.',
    },
    {
      japanese: '土曜日の午後７時は空いていますか？田中と申します。',
      furigana: '土曜日[どようび]の午後[ごご]７時[しちじ]は空[あ]いていますか？田中[たなか]と申[もう]します。',
      english: 'Do you have availability for Saturday at 7 PM? My name is Tanaka.',
      tip: 'Ask about table availability directly while politely stating your last name with ~と申します.',
    },
  ]);
});

const mockGenerateFurigana = vi.fn().mockImplementation((text) => Promise.resolve(text));

vi.mock('../../services/ai/EvaluationService', () => {
  return {
    EvaluationService: class {
      generateSessionReport = mockGenerateSessionReport;
      generateSpeakingSuggestions = mockGenerateSpeakingSuggestions;
      generateFurigana = mockGenerateFurigana;
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
    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
    expect(await screen.findByText(/Choose Your Conversation Partner/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Live Conversation/i)).toBeInTheDocument();
  });

  it('starts and ends a live conversation when controls are clicked', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
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

    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
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

    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
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

    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
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

    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
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

    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));

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

  it('renders suggestions mode chip and displays dynamic speaking suggestion pills during roleplay missions', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    // Switch to missions mode
    fireEvent.click(screen.getByRole('button', { name: /Goal-Oriented Roleplay Missions/i }));
    expect(await screen.findByText(/Reserving an Izakaya Table/i)).toBeInTheDocument();

    // Verify suggestions mode chip in header
    expect(screen.getByText(/Hints: AUTO/i)).toBeInTheDocument();

    // Start live conversation
    fireEvent.click(screen.getByText(/Start Live Roleplay Mission/i));

    // Verify turn completion triggers suggestion display
    await waitFor(() => {
      expect(screen.getByText(/What You Could Say Next/i)).toBeInTheDocument();
      expect(screen.getByText(/Excuse me, I would like to make a reservation/i)).toBeInTheDocument();
    });
  });

  it('renders fallback prompt when suggestionsMode is auto and suggestions fail to load', async () => {
    mockGenerateSpeakingSuggestions.mockResolvedValue([]);

    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Goal-Oriented Roleplay Missions/i }));
    expect(await screen.findByText(/Reserving an Izakaya Table/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Start Live Roleplay Mission/i));

    await waitFor(() => {
      expect(turnCallback).toBeDefined();
    });

    act(() => {
      turnCallback?.({ speaker: 'ai', text: '何名様でしょうか？' });
      turnCallback?.({ speaker: 'ai', text: '何名様でしょうか？', turnComplete: true });
    });

    expect(await screen.findByText(/Could not load suggestions right now\. Speak naturally when ready!/i)).toBeInTheDocument();

    // Reset default mock value for subsequent tests
    mockGenerateSpeakingSuggestions.mockImplementation((_transcript, _targetLevel, _apiKey, scenario) => {
      if (!scenario) {
        return Promise.resolve([
          {
            japanese: '最近、どんな映画や音楽に興味がありますか？',
            furigana: '最近[さいきん]、どんな映画[えいが]や音楽[おんがく]に興味[きょうみ]がありますか？',
            english: 'What kind of movies or music are you interested in recently?',
            tip: 'A natural open-ended question to steer the casual conversation.',
          },
          {
            japanese: '週末はいつもどのように過ごしていますか？',
            furigana: '週末[しゅうまつ]はいつもどのように過[す]ごしていますか？',
            english: 'How do you usually spend your weekends?',
            tip: 'Ask about daily routines or hobbies to keep the conversation flowing smoothly.',
          },
        ]);
      }
      return Promise.resolve([
        {
          japanese: 'すみません、土曜日の夜７時に５人で予約したいのですが。',
          furigana: 'すみません、土曜日[どようび]の夜[よる]７時[しちじ]に５人[ごにん]で予約[よやく]したいのですが。',
          english: 'Excuse me, I would like to make a reservation for 5 people on Saturday evening at 7.',
          tip: 'A polite, natural sentence using ~たいのですが to clearly state your reservation request.',
        },
        {
          japanese: '土曜日の午後７時は空いていますか？田中と申します。',
          furigana: '土曜日[どようび]の午後[ごご]７時[しちじ]は空[あ]いていますか？田中[たなか]と申[もう]します。',
          english: 'Do you have availability for Saturday at 7 PM? My name is Tanaka.',
          tip: 'Ask about table availability directly while politely stating your last name with ~と申します.',
        },
      ]);
    });
  });

  it('deduplicates speaking suggestion requests for the same turn id', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Goal-Oriented Roleplay Missions/i }));
    expect(await screen.findByText(/Reserving an Izakaya Table/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Start Live Roleplay Mission/i));

    await waitFor(() => {
      expect(turnCallback).toBeDefined();
    });

    mockGenerateSpeakingSuggestions.mockClear();

    // Simulate turn chunk then two identical turnComplete events for the same AI turn (e.g. duplicate or Strict Mode updater double execution)
    act(() => {
      turnCallback?.({ id: 'turn-double-test', speaker: 'ai', text: '何名様でしょうか？' });
      turnCallback?.({ id: 'turn-double-test', speaker: 'ai', text: '何名様でしょうか？', turnComplete: true });
      turnCallback?.({ id: 'turn-double-test', speaker: 'ai', text: '何名様でしょうか？', turnComplete: true });
    });

    await waitFor(() => {
      expect(mockGenerateSpeakingSuggestions).toHaveBeenCalledTimes(1);
    });
  });

  it('includes scenarioId and scenarioTitle when saving a mission session', async () => {
    const saveSessionSpy = vi.spyOn(repo, 'saveSession');
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Goal-Oriented Roleplay Missions/i }));
    const izakayaCards = await screen.findAllByText(/Reserving an Izakaya Table/i);
    fireEvent.click(izakayaCards[0]);
    fireEvent.click(screen.getByText(/Start Live Roleplay Mission/i));

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
    });

    act(() => {
      turnCallback?.({ speaker: 'user', text: 'こんにちは' });
    });

    fireEvent.click(screen.getByText(/End Conversation/i));

    await waitFor(() => {
      expect(saveSessionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: 'izakaya_reserve',
          scenarioTitle: 'Reserving an Izakaya Table',
        })
      );
    });
  });

  it('triggers generateSpeakingSuggestions immediately when toggled to auto mid-session', async () => {
    mockGenerateSpeakingSuggestions.mockClear();
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Goal-Oriented Roleplay Missions/i }));
    expect(await screen.findByText(/Reserving an Izakaya Table/i)).toBeInTheDocument();

    // Set suggestions mode to 'manual' before starting
    fireEvent.click(screen.getByText(/Hints: AUTO/i)); // Toggle to manual

    fireEvent.click(screen.getByText(/Start Live Roleplay Mission/i));

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
    });

    mockGenerateSpeakingSuggestions.mockClear();

    // Now toggle to 'auto' mid-session
    fireEvent.click(screen.getByText(/Hints: MANUAL/i)); // Toggle from manual to off
    fireEvent.click(screen.getByText(/Hints: OFF/i)); // Toggle from off to auto

    await waitFor(() => {
      expect(mockGenerateSpeakingSuggestions).toHaveBeenCalled();
    });
  });

  it('defaults to Goal-Oriented Roleplay Missions upon opening the studio', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    // Should render mission selection deck by default
    expect(await screen.findByText(/Reserving an Izakaya Table/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Goal-Oriented Roleplay Missions/i })).toHaveClass('bg-indigo-600');
  });

  it('renders speaking suggestions in Free Open-Ended Chat mode when turn completes', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    // Switch to Free Chat mode
    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
    fireEvent.click(screen.getByText(/Start Live Conversation/i));

    await waitFor(() => {
      expect(turnCallback).toBeDefined();
    });

    act(() => {
      turnCallback?.({ id: 'free-turn-1', speaker: 'ai', text: 'こんにちは！何について話しましょうか？' });
      turnCallback?.({ id: 'free-turn-1', speaker: 'ai', text: 'こんにちは！何について話しましょうか？', turnComplete: true });
    });

    await waitFor(() => {
      expect(screen.getByText(/What You Could Say Next/i)).toBeInTheDocument();
      expect(screen.getByText(/What kind of movies or music are you interested in recently/i)).toBeInTheDocument(); // mock suggestion string for free chat
    });
  });

  it('renders studio header buttons and controls with responsive mobile classes', () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    const missionsBtn = screen.getByRole('button', { name: /Goal-Oriented Roleplay Missions/i });
    const freeChatBtn = screen.getByRole('button', { name: /Free Open-Ended Chat/i });
    const modeSwitcherWrapper = missionsBtn.closest('div')!;

    expect(modeSwitcherWrapper).toHaveClass('flex-col', 'sm:flex-row');
    expect(missionsBtn).toHaveClass('w-full', 'sm:w-auto');
    expect(freeChatBtn).toHaveClass('w-full', 'sm:w-auto');

    const adaptiveChip = screen.getByText(/Adaptive Mode: AUTO/i).closest('button')!;
    const hintsChip = screen.getByText(/Hints: AUTO/i).closest('button')!;
    const modeChipsWrapper = adaptiveChip.closest('div')!;

    expect(modeChipsWrapper).toHaveClass('flex-col', 'sm:flex-row');
    expect(adaptiveChip).toHaveClass('w-full', 'sm:w-auto');
    expect(hintsChip).toHaveClass('w-full', 'sm:w-auto');
  });

  it('does not invoke generateFurigana on turn complete when furiganaEnabled is false', async () => {
    mockGenerateFurigana.mockClear();
    localStorage.setItem('nihongo_furigana', 'false');
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
    const startBtn = screen.getByText(/Start Live Conversation/i);
    await act(async () => {
      fireEvent.click(startBtn);
    });

    await waitFor(() => {
      expect(turnCallback).toBeDefined();
    });

    await act(async () => {
      turnCallback?.({ speaker: 'ai', text: 'こんにちは' });
      turnCallback?.({ speaker: 'ai', text: 'こんにちは', turnComplete: true });
    });

    expect(mockGenerateFurigana).not.toHaveBeenCalled();
  });
});









