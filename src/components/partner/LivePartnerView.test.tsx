import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivePartnerView } from './LivePartnerView';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SettingsProvider } from '../../context/SettingsContext';
import { EvaluationService } from '../../services/ai/EvaluationService';

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
const mockLookupTurnVocabulary = vi.fn().mockResolvedValue([]);
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

const sharedEvalServiceInstance = {
  generateSessionReport: mockGenerateSessionReport,
  generateSpeakingSuggestions: mockGenerateSpeakingSuggestions,
  generateFurigana: mockGenerateFurigana,
  lookupTurnVocabulary: mockLookupTurnVocabulary,
};

vi.mock('../../services/ai/EvaluationService', () => {
  return {
    EvaluationService: class {
      constructor() {
        return sharedEvalServiceInstance;
      }
    },
  };
});

describe('LivePartnerView', () => {
  const repo = new StorageRepository('test_partner_db_' + Math.random());
  const evalService = new EvaluationService();

  beforeEach(async () => {
    vi.clearAllMocks();
    turnCallback = undefined;
    localStorage.clear();
    localStorage.setItem('nihongo_api_key', 'test-api-key');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    await repo.clearUserHistory();
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

  it('generates session feedback report modal and adds grammar correction to notebook, invoking onStatsUpdated', async () => {
    const saveNotebookSpy = vi.spyOn(repo, 'saveNotebookItem');
    const onStatsUpdated = vi.fn();

    await act(async () => {
      render(
        <SettingsProvider>
          <LivePartnerView repository={repo} onStatsUpdated={onStatsUpdated} />
        </SettingsProvider>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
    });
    const startBtn = screen.getByText(/Start Live Conversation/i);
    await act(async () => {
      fireEvent.click(startBtn);
    });

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
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(await screen.findByText(/Executive Summary/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(onStatsUpdated).toHaveBeenCalled();
    });
    expect(screen.getAllByText('watashi iku').length).toBeGreaterThan(0);
    expect(screen.getAllByText('watashi wa ikimasu').length).toBeGreaterThan(0);

    const addBtn = screen.getAllByText(/Add to Notebook/i)[0];
    await act(async () => {
      fireEvent.click(addBtn);
    });

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

    const cards = await screen.findAllByText(/Izakaya Table Reservation/i);
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.click(cards[0]);

    expect(await screen.findByText(/Current Mission Goal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Customer calling to make a reservation/i)[0]).toBeInTheDocument();

    const startBtn = screen.getByText(/Start Live Roleplay Mission/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          title: 'Izakaya Table Reservation',
          goalDescription: expect.stringContaining('Call a busy izakaya to reserve a table for 4 people'),
        }),
        expect.any(Object),
        expect.any(String),
        expect.any(String),
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
        'auto',
        'auto',
        'ai_first'
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
    expect(await screen.findByText(/Izakaya Table Reservation/i)).toBeInTheDocument();

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
    expect(await screen.findByText(/Izakaya Table Reservation/i)).toBeInTheDocument();

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
    expect(await screen.findByText(/Izakaya Table Reservation/i)).toBeInTheDocument();
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
    const izakayaCards = await screen.findAllByText(/Izakaya Table Reservation/i);
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
          scenarioTitle: 'Izakaya Table Reservation',
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
    expect(await screen.findByText(/Izakaya Table Reservation/i)).toBeInTheDocument();

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
    expect(await screen.findByText(/Izakaya Table Reservation/i)).toBeInTheDocument();
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

  it('allows toggling turn vocabulary lookup on AI turns and saving items to notebook', async () => {
    vi.spyOn(evalService, 'lookupTurnVocabulary').mockResolvedValueOnce([
      { word: '検討', reading: 'けんとう', meaning: 'Consideration', jlptLevel: 'N3' },
    ]);

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
      expect(screen.getByText(/Transcript Drawer/i)).toBeInTheDocument();
    });

    // Open drawer and trigger an AI turn
    fireEvent.click(screen.getByText(/Transcript Drawer/i));

    act(() => {
      turnCallback?.({ speaker: 'ai', text: '詳しい内容を検討します。' });
      turnCallback?.({ turnComplete: true, speaker: 'ai', text: '詳しい内容を検討します。' });
    });

    const wordsBtns = await screen.findAllByRole('button', { name: /Words/i });
    expect(wordsBtns.length).toBeGreaterThanOrEqual(1);
    const wordsBtn = wordsBtns[0];

    // Click to lookup and expand words
    await act(async () => {
      fireEvent.click(wordsBtn);
    });

    expect(evalService.lookupTurnVocabulary).toHaveBeenCalledWith(
      '詳しい内容を検討します。',
      'N4',
      'test-api-key'
    );

    const vocabWords = await screen.findAllByText('検討');
    expect(vocabWords[0]).toBeInTheDocument();
    expect(screen.getAllByText('(けんとう)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Consideration')[0]).toBeInTheDocument();

    // Save item to notebook
    const saveBtns = screen.getAllByTitle('Save to Vocabulary Notebook');
    await act(async () => {
      fireEvent.click(saveBtns[0]);
    });

    const items = await repo.getNotebookItems();
    expect(items).toHaveLength(1);
    expect(items[0].originalText).toBe('検討');
    expect(items[0].category).toBe('vocabulary');
  });

  it('clears turn vocabulary state when starting and ending a session', async () => {
    vi.spyOn(evalService, 'lookupTurnVocabulary').mockResolvedValue([
      { word: '練習', reading: 'れんしゅう', meaning: 'Practice', jlptLevel: 'N4' },
    ]);

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
      expect(screen.getByText(/Transcript Drawer/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Transcript Drawer/i));

    // Turn 1 with fixed id
    act(() => {
      turnCallback?.({ id: 'fixed-turn-id', speaker: 'ai', text: '日本語を練習します。' });
      turnCallback?.({ id: 'fixed-turn-id', turnComplete: true, speaker: 'ai', text: '日本語を練習します。' });
    });

    const wordsBtns = await screen.findAllByRole('button', { name: /Words/i });
    expect(wordsBtns.length).toBeGreaterThanOrEqual(1);
    await act(async () => {
      fireEvent.click(wordsBtns[0]);
    });

    expect(await screen.findAllByText('練習')).toHaveLength(2); // One in main view, one in drawer
    expect(screen.getAllByText(/Hide Words/i).length).toBeGreaterThanOrEqual(1);

    // Close the drawer before ending session so showDrawer returns to false
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find((btn) => btn.querySelector('svg.lucide-x'));
    if (xButton) {
      await act(async () => {
        fireEvent.click(xButton);
      });
    }

    // End session - this should clear turnVocabMap, loadingVocabIds, expandedVocabIds
    await act(async () => {
      fireEvent.click(screen.getByText(/End Conversation/i));
    });

    turnCallback = undefined;

    // Start a new session
    await act(async () => {
      fireEvent.click(screen.getByText(/Start Live Conversation/i));
    });

    await waitFor(() => {
      expect(turnCallback).toBeDefined();
      expect(screen.getAllByText(/Transcript Drawer/i).length).toBeGreaterThanOrEqual(1);
    });

    // Trigger another turn with the same turn id
    act(() => {
      turnCallback?.({ id: 'fixed-turn-id', speaker: 'ai', text: '日本語を練習します。' });
      turnCallback?.({ id: 'fixed-turn-id', turnComplete: true, speaker: 'ai', text: '日本語を練習します。' });
    });

    // If turnVocabMap and expandedVocabIds were NOT cleared, "Hide Words" and "練習" would immediately be visible without clicking Words button
    expect(screen.queryByText(/Hide Words/i)).not.toBeInTheDocument();
    expect(screen.queryByText('練習')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Words/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Choose Your Roleplay Mission without parenthesis level and guards empty badge spans, invoking onStatsUpdated on endSession', async () => {
    const onStatsUpdated = vi.fn();
    await act(async () => {
      render(
        <SettingsProvider>
          <LivePartnerView repository={repo} onStatsUpdated={onStatsUpdated} />
        </SettingsProvider>
      );
    });

    // 1. Verify exact header text without (N4)
    expect(screen.getByText('Choose Your Roleplay Mission')).toBeInTheDocument();
    expect(screen.queryByText(/Choose Your Roleplay Mission \(/i)).not.toBeInTheDocument();

    // 2. Verify level-agnostic missions without jlptLevel do not render empty spans
    // Wait for scenario cards to render from async useEffect
    await screen.findAllByText(/Izakaya Table Reservation|Convenience Store \(Konbini\) Checkout|Doctor's Clinic Visit/i);
    const missionCards = screen.getAllByRole('button').filter((btn) =>
      btn.textContent?.includes('Izakaya Table Reservation') ||
      btn.textContent?.includes('Convenience Store (Konbini) Checkout') ||
      btn.textContent?.includes('Doctor\'s Clinic Visit')
    );
    expect(missionCards.length).toBeGreaterThanOrEqual(1);
    const izakayaCard = missionCards[0];
    const spans = izakayaCard.querySelectorAll('span');
    spans.forEach((span) => {
      expect(span.textContent?.trim()).not.toBe('');
    });

    // 3. Start a session, trigger a turn, and end session to verify onStatsUpdated is called
    const startBtn = screen.getByRole('button', { name: /Start Live/i });
    await act(async () => {
      fireEvent.click(startBtn);
    });

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
      expect(turnCallback).toBeDefined();
    });

    act(() => {
      turnCallback?.({ speaker: 'user', text: 'すみません' });
      turnCallback?.({ turnComplete: true, speaker: 'user', text: 'すみません' });
    });

    const endBtn = screen.getByRole('button', { name: /End Conversation/i });
    await act(async () => {
      fireEvent.click(endBtn);
    });

    await waitFor(() => {
      expect(onStatsUpdated).toHaveBeenCalled();
    });
  });

  it('renders and toggles Speaking Speed and Initiator selectors in studio and drawer, and passes them to client.connect', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    const paceBtn = screen.getByText(/⏱️ Pace:/i);
    expect(paceBtn).toBeInTheDocument();
    fireEvent.click(paceBtn);
    expect(screen.getByText(/⏱️ Pace: VERY_SLOW/i)).toBeInTheDocument();

    const initBtn = screen.getByText(/🗣️ Opens:/i);
    expect(initBtn).toBeInTheDocument();
    fireEvent.click(initBtn);
    expect(screen.getByText(/🗣️ Opens: You First/i)).toBeInTheDocument();

    const izakayaCards = await screen.findAllByText(/Izakaya Table Reservation/i);
    fireEvent.click(izakayaCards[0]);

    const startBtn = screen.getByText(/Start Live Roleplay Mission/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        'auto',
        'very_slow',
        'user_first'
      );
    });

    // Verify in drawer when connected
    fireEvent.click(screen.getByText(/Transcript Drawer/i));
    expect(await screen.findByText(/Live Transcript Drawer/i)).toBeInTheDocument();
    const allPaceBtns = screen.getAllByText(/⏱️ Pace: VERY_SLOW/i);
    expect(allPaceBtns.length).toBeGreaterThanOrEqual(2);
    allPaceBtns.forEach((btnEl) => {
      const btn = btnEl.closest('button')!;
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', 'Speed change will apply on next connection');
    });

    const allInitBtns = screen.getAllByText(/🗣️ Opens: You First/i);
    expect(allInitBtns.length).toBeGreaterThanOrEqual(2);
    allInitBtns.forEach((btnEl) => {
      const btn = btnEl.closest('button')!;
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', 'Initiator change will apply on next connection');
    });
  });

  it('renders tier badges on suggestions when present', async () => {
    mockGenerateSpeakingSuggestions.mockResolvedValueOnce([
      {
        japanese: 'はい、そうです。',
        furigana: 'はい、そうです。',
        english: 'Yes, that is right.',
        tip: 'Short response',
        tier: 'easy',
      },
      {
        japanese: 'いいえ、実は少し違いますね。',
        furigana: 'いいえ、実[じつ]は少[すこ]し違[ちが]いますね。',
        english: 'No, actually it is slightly different.',
        tip: 'Natural response',
        tier: 'natural',
      },
    ]);

    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    const izakayaCards = await screen.findAllByText(/Izakaya Table Reservation/i);
    fireEvent.click(izakayaCards[0]);

    fireEvent.click(screen.getByText(/Start Live Roleplay Mission/i));

    await waitFor(() => {
      expect(turnCallback).toBeDefined();
    });

    act(() => {
      turnCallback?.({ id: 'turn-tiered-1', speaker: 'ai', text: 'ご予約ですか？' });
      turnCallback?.({ id: 'turn-tiered-1', speaker: 'ai', text: 'ご予約ですか？', turnComplete: true });
    });

    await waitFor(() => {
      expect(screen.getByText('🌱 Bite-Sized (Easy)')).toBeInTheDocument();
      expect(screen.getByText('💬 Natural')).toBeInTheDocument();
    });
  });

  it('implements Smart Turn-Locking guard in onTurnEvent so hints do not refresh prematurely', async () => {
    mockGenerateSpeakingSuggestions.mockClear();
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    const izakayaCards = await screen.findAllByText(/Izakaya Table Reservation/i);
    fireEvent.click(izakayaCards[0]);

    fireEvent.click(screen.getByText(/Start Live Roleplay Mission/i));

    await waitFor(() => {
      expect(turnCallback).toBeDefined();
    });

    mockGenerateSpeakingSuggestions.mockClear();

    // 1. Initial AI turn (> 5 chars) generates suggestions
    act(() => {
      turnCallback?.({ id: 'turn-smart-1', speaker: 'ai', text: '何名様でしょうか？どうぞ！' });
      turnCallback?.({ id: 'turn-smart-1', speaker: 'ai', text: '何名様でしょうか？どうぞ！', turnComplete: true });
    });

    await waitFor(() => {
      expect(mockGenerateSpeakingSuggestions).toHaveBeenCalledTimes(1);
    });

    mockGenerateSpeakingSuggestions.mockClear();

    // 2. Next turn is a brief filler from AI (< 5 chars, e.g. "はい。") when suggestions already exist -> should NOT refresh hints
    act(() => {
      turnCallback?.({ id: 'turn-smart-2', speaker: 'ai', text: 'はい。' });
      turnCallback?.({ id: 'turn-smart-2', speaker: 'ai', text: 'はい。', turnComplete: true });
    });

    // Should not call generateSpeakingSuggestions because it's a brief filler and suggestions > 0
    expect(mockGenerateSpeakingSuggestions).not.toHaveBeenCalled();

    // 3. User speaks right now, setting lastUserTurnTimestampRef to Date.now()
    act(() => {
      turnCallback?.({ id: 'turn-user-1', speaker: 'user', text: 'ええと...' });
      turnCallback?.({ id: 'turn-user-1', speaker: 'user', text: 'ええと...', turnComplete: true });
    });

    // Immediately after (< 1500ms), AI finishes a longer turn while user just hesitated/spoke
    act(() => {
      turnCallback?.({ id: 'turn-smart-3', speaker: 'ai', text: '少しお待ちくださいませ。' });
      turnCallback?.({ id: 'turn-smart-3', speaker: 'ai', text: '少しお待ちくださいませ。', turnComplete: true });
    });

    // Should not call generateSpeakingSuggestions because user spoke recently (< 1500ms)
    expect(mockGenerateSpeakingSuggestions).not.toHaveBeenCalled();
  });
});











