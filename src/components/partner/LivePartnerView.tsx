import React, { useState, useEffect, useRef } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { PersonaService } from '../../services/persona/PersonaService';
import { EvaluationService } from '../../services/ai/EvaluationService';
import { LiveAudioClient } from '../../services/ai/LiveAudioClient';
import { RoleplayScenarioService } from '../../services/scenarios/RoleplayScenarioService';
import { ProficiencyProfileService } from '../../services/ai/ProficiencyProfileService';
import { PersonaId, ConversationTurn, SessionReport, GrammarCorrection, RoleplayScenario, ProficiencyProfile, SpeakingSuggestion, TurnVocabularyItem } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { renderFurigana } from '../../utils/furigana';
import { WaveformVisualizer } from './WaveformVisualizer';
import { CreateCustomScenarioModal } from './CreateCustomScenarioModal';
import { Mic, PhoneOff, Sparkles, BookPlus, BookOpen, MessageSquare, X, Target, Plus, MessageCircle } from 'lucide-react';

interface LivePartnerViewProps {
  repository: StorageRepository;
  onStatsUpdated?: () => void;
}

export const LivePartnerView: React.FC<LivePartnerViewProps> = ({ repository, onStatsUpdated }) => {
  const {
    apiKey,
    defaultLevel,
    furiganaEnabled,
    setFuriganaEnabled,
    adaptationMode,
    setAdaptationMode,
    suggestionsMode,
    setSuggestionsMode,
    initiator,
    setInitiator,
  } = useSettings();
  const isOnline = useOnlineStatus();
  const [mode, setMode] = useState<'free' | 'missions'>('missions');
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('casual_friend');
  const [scenarios, setScenarios] = useState<RoleplayScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<RoleplayScenario | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [suggestions, setSuggestions] = useState<SpeakingSuggestion[]>([]);
  const suggestionsRef = useRef<SpeakingSuggestion[]>([]);
  const updateSuggestions = (s: SpeakingSuggestion[]) => {
    suggestionsRef.current = s;
    setSuggestions(s);
  };
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  const toggleSuggestionsMode = () => {
    if (suggestionsMode === 'auto') setSuggestionsMode('manual');
    else if (suggestionsMode === 'manual') setSuggestionsMode('off');
    else setSuggestionsMode('auto');
  };

  const toggleInitiator = () => {
    setInitiator(initiator === 'ai_first' ? 'user_first' : 'ai_first');
  };

  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [rmsLevels, setRmsLevels] = useState({ inputRms: 0, outputRms: 0 });
  const [report, setReport] = useState<SessionReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [turnVocabMap, setTurnVocabMap] = useState<Record<string, TurnVocabularyItem[]>>({});
  const [loadingVocabIds, setLoadingVocabIds] = useState<Set<string>>(new Set());
  const [expandedVocabIds, setExpandedVocabIds] = useState<Set<string>>(new Set());

  const handleToggleTurnVocab = async (turnId: string, text: string) => {
    if (expandedVocabIds.has(turnId)) {
      setExpandedVocabIds((prev) => {
        const next = new Set(prev);
        next.delete(turnId);
        return next;
      });
      return;
    }

    if (turnVocabMap[turnId]) {
      setExpandedVocabIds((prev) => new Set(prev).add(turnId));
      return;
    }

    if (!isOnline) {
      setStatusMessage('You are offline. Vocabulary lookup requires an active internet connection.');
      return;
    }

    if (!apiKey) {
      setStatusMessage('Please configure your Gemini API Key in Settings to look up vocabulary.');
      return;
    }

    setLoadingVocabIds((prev) => new Set(prev).add(turnId));
    try {
      const vocab = await evalService.lookupTurnVocabulary(text, defaultLevel, apiKey);
      setTurnVocabMap((prev) => ({ ...prev, [turnId]: vocab }));
      setExpandedVocabIds((prev) => new Set(prev).add(turnId));
    } catch (e) {
      console.error(e);
      setStatusMessage('Failed to look up vocabulary.');
    } finally {
      setLoadingVocabIds((prev) => {
        const next = new Set(prev);
        next.delete(turnId);
        return next;
      });
    }
  };

  const handleSaveVocabToNotebook = async (item: TurnVocabularyItem) => {
    try {
      await repository.saveNotebookItem({
        id: `vocab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
        category: 'vocabulary',
        jlptLevel: item.jlptLevel || defaultLevel,
        originalText: item.word,
        correctedText: `${item.word} (${item.reading})`,
        furiganaText: `${item.word} (${item.reading})`,
        explanation: item.meaning,
        mastered: false,
      });
      setStatusMessage(`Saved "${item.word}" to Vocabulary Notebook!`);
    } catch (e) {
      console.error(e);
      setStatusMessage('Failed to save word to notebook.');
    }
  };
  const [showDrawer, setShowDrawer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to connect.');
  const [profile, setProfile] = useState<ProficiencyProfile | null>(null);

  const personaService = new PersonaService();
  const evalService = new EvaluationService();
  const scenarioService = new RoleplayScenarioService(repository);
  const profileService = new ProficiencyProfileService(repository);
  const clientRef = useRef<LiveAudioClient | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const currentSessionIdRef = useRef<string>('sess-' + Date.now());
  const annotatingIdsRef = useRef<Set<string>>(new Set());
  const lastSuggestedTurnIdRef = useRef<string | null>(null);
  const lastUserTurnTimestampRef = useRef<number>(0);

  useEffect(() => {
    clientRef.current = new LiveAudioClient();
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchScenarios = async () => {
      const list = await scenarioService.getScenariosByLevel(defaultLevel);
      setScenarios(list);
      if (list.length > 0 && !selectedScenario) {
        setSelectedScenario(list[0]);
      }
    };
    fetchScenarios();
  }, [defaultLevel, repository]);

  useEffect(() => {
    if (adaptationMode === 'auto') {
      profileService.getProficiencyProfile(defaultLevel).then((prof) => setProfile(prof));
    } else {
      setProfile(null);
    }
  }, [adaptationMode, defaultLevel, repository]);

  useEffect(() => {
    if (!isConnected) {
      setRmsLevels({ inputRms: 0, outputRms: 0 });
      return;
    }
    const interval = setInterval(() => {
      if (clientRef.current) {
        setRmsLevels(clientRef.current.getVolumes());
      }
    }, 80);
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    if (!furiganaEnabled || !apiKey || transcript.length === 0) return;
    transcript.forEach((t, idx) => {
      const isDoneOrNotLatest = t.id.endsWith('-done') || idx < transcript.length - 1;
      const baseId = t.id.replace('-done', '');
      if (
        furiganaEnabled &&
        apiKey &&
        isDoneOrNotLatest &&
        !t.furiganaText &&
        t.text.trim() &&
        !annotatingIdsRef.current.has(t.id) &&
        !annotatingIdsRef.current.has(baseId)
      ) {
        annotatingIdsRef.current.add(t.id);
        annotatingIdsRef.current.add(baseId);
        annotatingIdsRef.current.add(baseId + '-done');
        evalService.generateFurigana(t.text, apiKey).then((furigana) => {
          if (furigana && furigana !== t.text) {
            setTranscript((cur) =>
              cur.map((row) => (row.id === t.id || row.id === t.id + '-done' ? { ...row, furiganaText: furigana } : row))
            );
          }
        });
      }
    });
  }, [transcript, furiganaEnabled, apiKey]);

  const prevSuggestionsModeRef = useRef<string>(suggestionsMode);
  const latestStateRef = useRef({ selectedPersona, defaultLevel, apiKey, transcript });

  useEffect(() => {
    latestStateRef.current = { selectedPersona, defaultLevel, apiKey, transcript };
  });

  useEffect(() => {
    const prevMode = prevSuggestionsModeRef.current;
    prevSuggestionsModeRef.current = suggestionsMode;

    if (
      suggestionsMode === 'auto' &&
      prevMode !== 'auto' &&
      isConnected &&
      (mode === 'free' || Boolean(selectedScenario)) &&
      suggestions.length === 0 &&
      !isLoadingSuggestions
    ) {
      const { selectedPersona, defaultLevel, apiKey, transcript } = latestStateRef.current;
      if (transcript.length > 0) {
        const lastTurn = transcript[transcript.length - 1];
        lastSuggestedTurnIdRef.current = lastTurn.id.replace('-done', '');
      }
      setIsLoadingSuggestions(true);
      evalService
        .generateSpeakingSuggestions(transcript, defaultLevel, apiKey, mode === 'missions' && selectedScenario ? selectedScenario : undefined, selectedPersona)
        .then((s) => updateSuggestions(s))
        .finally(() => setIsLoadingSuggestions(false));
    }
  }, [suggestionsMode, isConnected, mode, selectedScenario]);

  const startSession = async () => {
    if (!isOnline) {
      alert('You are offline. Live voice conversations require an active internet connection.');
      return;
    }
    if (!apiKey) {
      alert('Please configure your Gemini API Key in Settings first.');
      return;
    }
    const client = clientRef.current;
    if (!client) return;

    if (mode === 'missions' && !selectedScenario) {
      alert('Please select a Roleplay Mission first.');
      return;
    }

    setTranscript([]);
    setReport(null);
    setSuggestions([]);
    suggestionsRef.current = [];
    setTurnVocabMap({});
    setLoadingVocabIds(new Set());
    setExpandedVocabIds(new Set());
    lastSuggestedTurnIdRef.current = null;
    if ((mode === 'free' || Boolean(selectedScenario)) && suggestionsMode === 'auto') {
      setIsLoadingSuggestions(true);
      evalService.generateSpeakingSuggestions([], defaultLevel, apiKey, mode === 'missions' && selectedScenario ? selectedScenario : undefined, selectedPersona)
        .then(s => updateSuggestions(s))
        .finally(() => setIsLoadingSuggestions(false));
    }
    sessionStartTimeRef.current = Date.now();
    currentSessionIdRef.current = 'sess-' + Date.now();
    setStatusMessage('Connecting to Gemini Live API WebSocket...');

    client.onTurnEvent((turn) => {
      if (turn.speaker === 'user' && (turn.text.trim() || turn.interrupted)) {
        lastUserTurnTimestampRef.current = Date.now();
      }

      if (turn.text.startsWith('⚠️')) {
        setStatusMessage(turn.text);
        return;
      } else if (turn.interrupted) {
        setStatusMessage('AI interrupted by user speaking.');
        return;
      } else if (turn.turnComplete) {
        if (turn.speaker === 'user' && turn.text.trim()) {
          lastUserTurnTimestampRef.current = Date.now();
        }
        // Mark the latest turn as complete and fetch its furigana readings in the background only when furigana is enabled
        setTranscript((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (furiganaEnabled && apiKey && !last.furiganaText && last.text.trim() && !annotatingIdsRef.current.has(last.id)) {
            annotatingIdsRef.current.add(last.id);
            annotatingIdsRef.current.add(last.id.replace('-done', '') + '-done');
            evalService.generateFurigana(last.text, apiKey).then((furigana) => {
              if (furigana && furigana !== last.text) {
                setTranscript((cur) =>
                  cur.map((t) => (t.id === last.id || t.id === last.id + '-done' ? { ...t, furiganaText: furigana } : t))
                );
              }
            });
          }
          const baseId = last.id.replace('-done', '');
          const updatedTranscript = [...prev.slice(0, -1), { ...last, id: baseId + '-done' }];
          if ((mode === 'free' || Boolean(selectedScenario)) && turn.speaker === 'ai' && suggestionsMode === 'auto') {
            // Smart Turn-Locking guard:
            // 1. Do not refresh if AI turn was interrupted by user
            // 2. Do not refresh if AI text is a brief filler (< 5 Japanese characters) AND suggestions already exist
            // 3. Do not refresh if user spoke recently (< 1500ms ago)
            const isBriefFiller = last.text.trim().length < 5;
            const timeSinceUserSpoke = Date.now() - lastUserTurnTimestampRef.current;
            const userSpokeRecently = timeSinceUserSpoke < 1500;

            const shouldTriggerHintsRefresh =
              !turn.interrupted &&
              (!isBriefFiller || (suggestions.length === 0 && suggestionsRef.current.length === 0)) &&
              !userSpokeRecently &&
              (!lastSuggestedTurnIdRef.current || lastSuggestedTurnIdRef.current !== baseId);

            if (shouldTriggerHintsRefresh) {
              lastSuggestedTurnIdRef.current = baseId;
              setIsLoadingSuggestions(true);
              evalService.generateSpeakingSuggestions(updatedTranscript, defaultLevel, apiKey, mode === 'missions' && selectedScenario ? selectedScenario : undefined, selectedPersona)
                .then(s => updateSuggestions(s))
                .finally(() => setIsLoadingSuggestions(false));
            }
          }
          return updatedTranscript;
        });
        return;
      } else if (turn.text) {
        setStatusMessage(`${turn.speaker === 'user' ? 'You' : 'AI'} speaking: "${turn.text.slice(0, 40)}..."`);
      }

      if (turn.speaker === 'user' && turn.text.trim()) {
        lastUserTurnTimestampRef.current = Date.now();
      }

      if (!turn.text.trim()) return;

      setTranscript((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].speaker === turn.speaker && !prev[prev.length - 1].id.endsWith('-done')) {
          const last = prev[prev.length - 1];
          // If turn.text is a cumulative update that starts with or contains the old text
          if (turn.text.startsWith(last.text) || turn.text.length >= last.text.length) {
            return [...prev.slice(0, -1), { ...last, text: turn.text }];
          }
          // If old text already contains this chunk (duplicate), leave as is
          if (last.text.includes(turn.text)) {
            return prev;
          }
          // Otherwise, append chunk
          return [...prev.slice(0, -1), { ...last, text: last.text + ' ' + turn.text }];
        }
        return [
          ...prev,
          {
            id: turn.id || 'turn-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            speaker: turn.speaker,
            text: turn.text,
            timestamp: Date.now(),
          },
        ];
      });
    });

    try {
      let currentProfile = profile;
      if (adaptationMode === 'auto') {
        currentProfile = await profileService.getProficiencyProfile(defaultLevel);
        setProfile(currentProfile);
      }

      await client.connect(
        selectedPersona,
        defaultLevel,
        apiKey,
        mode === 'missions' && selectedScenario ? selectedScenario : undefined,
        adaptationMode === 'auto' ? (currentProfile || undefined) : undefined,
        adaptationMode,
        initiator
      );
      setIsConnected(true);
      setStatusMessage(
        mode === 'missions' && selectedScenario
          ? `🟢 Connected! Roleplay: "${selectedScenario.title}". Speak Japanese to achieve your goal!`
          : '🟢 Connected & Streaming Microphone (16kHz PCM). Speak now!'
      );
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`⚠️ Connection failed: ${err?.message || err}`);
    }
  };

  const endSession = async () => {
    clientRef.current?.disconnect();
    setIsConnected(false);
    setTurnVocabMap({});
    setLoadingVocabIds(new Set());
    setExpandedVocabIds(new Set());

    if (transcript.length > 0) {
      const elapsed = Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
      await repository.saveSession({
        id: currentSessionIdRef.current,
        timestamp: sessionStartTimeRef.current,
        durationSeconds: elapsed,
        personaId: selectedPersona,
        jlptLevel: defaultLevel,
        transcript,
        scenarioId: mode === 'missions' && selectedScenario ? selectedScenario.id : undefined,
        scenarioTitle: mode === 'missions' && selectedScenario ? selectedScenario.title : undefined,
      });
      onStatsUpdated?.();
    }
  };

  const handleFetchManualSuggestions = async () => {
    if (!isOnline) {
      alert('You are offline. Generating speaking suggestions requires an active internet connection.');
      return;
    }
    if (mode === 'missions' && !selectedScenario) return;
    setIsLoadingSuggestions(true);
    try {
      const s = await evalService.generateSpeakingSuggestions(transcript, defaultLevel, apiKey, mode === 'missions' && selectedScenario ? selectedScenario : undefined, selectedPersona);
      updateSuggestions(s);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!isOnline) {
      alert('You are offline. Generating session feedback reports requires an active internet connection.');
      return;
    }
    if (transcript.length === 0 || !apiKey) return;
    setGeneratingReport(true);
    try {
      const rep = await evalService.generateSessionReport(
        transcript,
        defaultLevel,
        apiKey,
        mode === 'missions' && selectedScenario ? selectedScenario : undefined
      );
      setReport(rep);
      setShowReportModal(true);

      const elapsed = Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
      await repository.saveSession({
        id: currentSessionIdRef.current,
        timestamp: sessionStartTimeRef.current,
        durationSeconds: elapsed,
        personaId: selectedPersona,
        jlptLevel: defaultLevel,
        transcript,
        feedbackReport: rep,
        scenarioId: mode === 'missions' && selectedScenario ? selectedScenario.id : undefined,
        scenarioTitle: mode === 'missions' && selectedScenario ? selectedScenario.title : undefined,
      });
      onStatsUpdated?.();
    } catch (err) {
      console.error(err);
      alert('Failed to generate session feedback report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleAddToNotebook = async (g: GrammarCorrection) => {
    await repository.saveNotebookItem({
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: Date.now(),
      category: 'grammar',
      jlptLevel: g.jlptLevel || defaultLevel,
      originalText: g.originalPart,
      correctedText: g.correctedPart,
      furiganaText: g.correctedPart,
      explanation: g.explanation,
      mastered: false,
    });
    alert('Added to Notebook!');
  };

  const renderTurnVocabularyUI = (t: { id: string; speaker: string; text: string }) => {
    if (t.speaker !== 'ai' || !t.text.trim()) return null;

    const isLoading = loadingVocabIds.has(t.id);
    const isExpanded = expandedVocabIds.has(t.id);
    const vocabList = turnVocabMap[t.id];

    return (
      <div className="mt-2 pt-2 border-t border-slate-700/50">
        <button
          type="button"
          onClick={() => handleToggleTurnVocab(t.id, t.text)}
          disabled={isLoading || !isOnline}
          title={!isOnline ? "Requires internet connection" : ""}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/80 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-300 border border-indigo-700/50 transition-colors"
        >
          {isLoading ? (
            <span className="animate-pulse">Loading Words...</span>
          ) : (
            <>
              <BookOpen className="w-3.5 h-3.5" />
              {isExpanded ? 'Hide Words' : 'Words'}
            </>
          )}
        </button>

        {isExpanded && vocabList && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Key Vocabulary in this Turn:
            </p>
            {vocabList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No complex vocabulary detected.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {vocabList.map((v, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/50 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-100">{v.word}</span>
                        <span className="text-xs text-indigo-300">({v.reading})</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {v.jlptLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{v.meaning}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveVocabToNotebook(v)}
                      title="Save to Vocabulary Notebook"
                      className="p-1.5 rounded-lg bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700/50 transition-colors shrink-0"
                    >
                      <BookPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const personas = personaService.getAllPersonas();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Live Conversation Partner Studio</h2>
          <p className="text-sm text-slate-400 mt-1">
            Ultra-low-latency voice conversation and goal-oriented roleplay missions via Gemini Live API.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-3 w-full md:w-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isConnected}
              title={isConnected ? "Mode change will apply on next connection" : ""}
              onClick={() => setAdaptationMode(adaptationMode === 'auto' ? 'rigid' : 'auto')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition-all w-full sm:w-auto ${
                adaptationMode === 'auto'
                  ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/80'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {adaptationMode === 'auto' ? `🧠 Adaptive Mode: AUTO (${profile?.estimatedLevel || defaultLevel})` : `🔒 Rigid Mode: STRICT ${defaultLevel}`}
            </button>

            <button
              type="button"
              onClick={toggleSuggestionsMode}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition-all w-full sm:w-auto ${
                suggestionsMode !== 'off'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              💡 Hints: {suggestionsMode.toUpperCase()}
            </button>

            <button
              type="button"
              disabled={isConnected}
              title={isConnected ? "Initiator change will apply on next connection" : ""}
              onClick={toggleInitiator}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition-all w-full sm:w-auto bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗣️ Opens: {initiator === 'ai_first' ? 'AI First' : 'You First'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 w-full sm:w-auto">
            <button
              type="button"
              disabled={isConnected}
              onClick={() => setMode('missions')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all w-full sm:w-auto ${
                mode === 'missions'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-4 h-4" />
              Goal-Oriented Roleplay Missions
            </button>
            <button
              type="button"
              disabled={isConnected}
              onClick={() => setMode('free')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all w-full sm:w-auto ${
                mode === 'free'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Free Open-Ended Chat
            </button>
          </div>
        </div>
      </div>

      {mode === 'free' ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Choose Your Conversation Partner</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personas.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isConnected}
                onClick={() => setSelectedPersona(p.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedPersona === p.id
                    ? 'bg-indigo-950/40 border-indigo-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className="font-semibold text-slate-100">{p.name}</p>
                <p className="text-xs text-indigo-400 mt-0.5">{p.speechRegister}</p>
                <p className="text-xs text-slate-400 mt-2">{p.roleDescription}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-400">Choose Your Roleplay Mission</h3>
            <button
              type="button"
              disabled={isConnected}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Custom Mission
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={isConnected}
                onClick={() => setSelectedScenario(s)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedScenario?.id === s.id
                    ? 'bg-indigo-950/40 border-indigo-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  {s.jlptLevel ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-500/30">
                      {s.jlptLevel}
                    </span>
                  ) : null}
                  <span className="text-xs text-slate-400 uppercase">{s.category}</span>
                </div>
                <p className="font-semibold text-slate-100 mt-1">{s.title}</p>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{s.goalDescription}</p>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-300 font-mono">
                  <span>You: {s.userRole}</span>
                  <span>AI: {s.aiRole}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live Mission HUD when active */}
      {mode === 'missions' && selectedScenario && (
        <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Current Mission Goal</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{selectedScenario.jlptLevel} • {selectedScenario.title}</span>
          </div>
          <p className="text-sm font-semibold text-slate-100 leading-relaxed">{selectedScenario.goalDescription}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs text-slate-400 pt-2 border-t border-indigo-500/20">
            <span><strong>Your Role:</strong> {selectedScenario.userRole}</span>
            <span><strong>Partner Role:</strong> {selectedScenario.aiRole}</span>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center space-y-6">
        <div className="w-full max-w-lg px-4 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-center text-xs font-mono text-slate-300">
          Status:{' '}
          {!isOnline ? (
            <span className="text-amber-400 font-semibold">
              📡 Offline Mode: Voice conversations and AI evaluations require an active internet connection.
            </span>
          ) : (
            <span className="text-indigo-400">{statusMessage}</span>
          )}
        </div>

        {/* Dynamic Speaking Suggestions Panel */}
        {isConnected && (mode === 'free' || Boolean(selectedScenario)) && suggestionsMode !== 'off' && (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-3 transition-all w-full max-w-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
              <div className="flex items-center gap-2 text-amber-400">
                <span className="text-base">💡</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">What You Could Say Next</span>
              </div>
              {isLoadingSuggestions && (
                <span className="text-xs text-indigo-400 animate-pulse font-medium">Generating response hints...</span>
              )}
            </div>

            {suggestionsMode === 'manual' && suggestions.length === 0 && !isLoadingSuggestions && (
              <div className="text-center py-2">
                <button
                  type="button"
                  onClick={handleFetchManualSuggestions}
                  disabled={!isOnline}
                  title={!isOnline ? "Requires internet connection" : ""}
                  className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition-all shadow-sm"
                >
                  💡 Stuck? Click to Generate Response Suggestions
                </button>
              </div>
            )}

            {suggestionsMode === 'auto' && suggestions.length === 0 && !isLoadingSuggestions && transcript.length > 0 && (
              <div className="text-xs text-slate-400 italic py-2 text-center">Could not load suggestions right now. Speak naturally when ready!</div>
            )}

            {suggestions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-100">
                        {renderFurigana(item.furigana || item.japanese, furiganaEnabled)}
                      </span>
                      {item.tier === 'easy' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 shrink-0">
                          🌱 Bite-Sized (Easy)
                        </span>
                      )}
                      {item.tier === 'natural' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-500/30 shrink-0">
                          💬 Natural
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 italic">{item.english}</p>
                    <p className="text-[11px] text-indigo-400/90 font-medium">💡 Tip: {item.tip}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isConnected ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            <div className="w-full bg-slate-950 p-4 rounded-xl border border-indigo-500/30 shadow-inner flex flex-col items-center">
              <span className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider">
                Real-Time Audio Stream (16kHz / 24kHz PCM)
              </span>
              <WaveformVisualizer inputRms={rmsLevels.inputRms} outputRms={rmsLevels.outputRms} isActive={isConnected} />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto max-w-md">
              <button
                type="button"
                onClick={() => setShowDrawer(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-all w-full sm:w-auto"
              >
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Transcript Drawer ({transcript.length})
              </button>

              <button
                type="button"
                onClick={endSession}
                className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/30 transition-all w-full sm:w-auto"
              >
                <PhoneOff className="w-4 h-4" />
                End Conversation
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={!isOnline}
            title={!isOnline ? "Requires internet connection" : ""}
            onClick={startSession}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Mic className="w-5 h-5" />
            {mode === 'missions' ? 'Start Live Roleplay Mission' : 'Start Live Conversation'}
          </button>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-200">Conversation Transcript</h3>
              <button
                type="button"
                onClick={() => setFuriganaEnabled(!furiganaEnabled)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  furiganaEnabled
                    ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Furigana: {furiganaEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => setShowDrawer(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Slide-out Drawer
              </button>
            </div>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={generatingReport || !isOnline}
              title={!isOnline ? "Requires internet connection" : ""}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              {generatingReport ? 'Evaluating Session...' : 'Generate Feedback Report'}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-3 p-4 rounded-lg bg-slate-950 border border-slate-800">
            {transcript.map((t) => (
              <div
                key={t.id}
                className={`p-3 rounded-lg max-w-[80%] ${
                  t.speaker === 'user'
                    ? 'ml-auto bg-indigo-900/40 border border-indigo-500/30'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              >
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  {t.speaker === 'user' ? 'You' : 'Speaking Partner'}
                </p>
                <div className="text-sm text-slate-100 leading-relaxed">
                  {renderFurigana(t.furiganaText || t.text, furiganaEnabled)}
                </div>
                {renderTurnVocabularyUI(t)}
              </div>
            ))}
          </div>

          {report && (
            <div className="p-5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-4">
              <h4 className="font-bold text-indigo-400">Executive Session Feedback</h4>
              <p className="text-sm text-slate-200">{report.summary}</p>

              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top Grammar Patterns to Review:</p>
                <ul className="space-y-2">
                  {report.topGrammarCorrections.map((g, idx) => (
                    <li key={idx} className="text-sm bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <div className="text-rose-400 line-through">{renderFurigana(g.originalPart, furiganaEnabled)}</div>
                      <div className="text-emerald-400 font-semibold">{renderFurigana(g.correctedPart, furiganaEnabled)}</div>
                      <p className="text-xs text-slate-400 mt-1">{g.explanation}</p>
                      <button
                        type="button"
                        onClick={() => handleAddToNotebook(g)}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700/50 transition-colors"
                      >
                        <BookPlus className="w-3.5 h-3.5" />
                        Add to Notebook
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Slide-out Transcript Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Live Transcript Drawer</h3>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Adaptation Mode</span>
                <button
                  type="button"
                  disabled={isConnected}
                  title={isConnected ? "Mode change will apply on next connection" : ""}
                  onClick={() => setAdaptationMode(adaptationMode === 'auto' ? 'rigid' : 'auto')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    adaptationMode === 'auto'
                      ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300 hover:bg-indigo-900/80'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {adaptationMode === 'auto' ? `🧠 Adaptive Mode: AUTO (${profile?.estimatedLevel || defaultLevel})` : `🔒 Rigid Mode: STRICT ${defaultLevel}`}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-400">Response Suggestions</span>
                <button
                  type="button"
                  onClick={toggleSuggestionsMode}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    suggestionsMode !== 'off'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  💡 Hints: {suggestionsMode.toUpperCase()}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-400">Conversation Opening</span>
                <button
                  type="button"
                  disabled={isConnected}
                  title={isConnected ? "Initiator change will apply on next connection" : ""}
                  onClick={toggleInitiator}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🗣️ Opens: {initiator === 'ai_first' ? 'AI First' : 'You First'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-400">Furigana Display</span>
                <button
                  type="button"
                  onClick={() => setFuriganaEnabled(!furiganaEnabled)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    furiganaEnabled
                      ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {furiganaEnabled ? 'Furigana ON' : 'Furigana OFF'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {transcript.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No conversation turns yet.</p>
              ) : (
                transcript.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-lg ${
                      t.speaker === 'user'
                        ? 'ml-auto bg-indigo-900/40 border border-indigo-500/30 max-w-[85%]'
                        : 'bg-slate-800 border border-slate-700 max-w-[85%]'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-400 mb-1">
                      {t.speaker === 'user' ? 'You' : 'Speaking Partner'}
                    </p>
                    <div className="text-sm text-slate-100 leading-relaxed">
                      {renderFurigana(t.furiganaText || t.text, furiganaEnabled)}
                    </div>
                    {renderTurnVocabularyUI(t)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* End-of-session Generate Session Feedback Report Modal */}
      {showReportModal && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-indigo-400">Session Feedback Report</h3>
                <p className="text-xs text-slate-400">Estimated JLPT Level: {report.estimatedLevel}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h4 className="text-sm font-semibold text-slate-300 mb-1">Executive Summary</h4>
              <p className="text-sm text-slate-200">{report.summary}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Top Grammar Corrections</h4>
              <div className="space-y-3">
                {report.topGrammarCorrections.map((g, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-rose-400 line-through">{g.originalPart}</p>
                        <p className="text-sm font-semibold text-emerald-400">{g.correctedPart}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToNotebook(g)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700/50 transition-colors shrink-0"
                      >
                        <BookPlus className="w-3.5 h-3.5" />
                        Add to Notebook
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">{g.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {report.naturalPhrasingTips && report.naturalPhrasingTips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Natural Phrasing Tips</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                  {report.naturalPhrasingTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateCustomScenarioModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (scenario) => {
            await scenarioService.createCustomScenario(scenario);
            const list = await scenarioService.getScenariosByLevel(defaultLevel);
            setScenarios(list);
            setSelectedScenario(scenario);
          }}
        />
      )}
    </div>
  );
};
