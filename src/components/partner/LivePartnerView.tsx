import React, { useState, useEffect, useRef } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { PersonaService } from '../../services/persona/PersonaService';
import { EvaluationService } from '../../services/ai/EvaluationService';
import { LiveAudioClient } from '../../services/ai/LiveAudioClient';
import { PersonaId, ConversationTurn, SessionReport, GrammarCorrection } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { renderFurigana } from '../../utils/furigana';
import { WaveformVisualizer } from './WaveformVisualizer';
import { Mic, PhoneOff, Sparkles, BookPlus, MessageSquare, X } from 'lucide-react';

interface LivePartnerViewProps {
  repository: StorageRepository;
}

export const LivePartnerView: React.FC<LivePartnerViewProps> = ({ repository }) => {
  const { apiKey, defaultLevel, furiganaEnabled, setFuriganaEnabled } = useSettings();
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('casual_friend');
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [rmsLevels, setRmsLevels] = useState({ inputRms: 0, outputRms: 0 });
  const [report, setReport] = useState<SessionReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to connect.');

  const personaService = new PersonaService();
  const evalService = new EvaluationService();
  const clientRef = useRef<LiveAudioClient | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const currentSessionIdRef = useRef<string>('sess-' + Date.now());
  const annotatingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    clientRef.current = new LiveAudioClient();
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

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
      if (isDoneOrNotLatest && !t.furiganaText && t.text.trim() && !annotatingIdsRef.current.has(t.id)) {
        annotatingIdsRef.current.add(t.id);
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

  const startSession = async () => {
    if (!apiKey) {
      alert('Please configure your Gemini API Key in Settings first.');
      return;
    }
    const client = clientRef.current;
    if (!client) return;

    setTranscript([]);
    setReport(null);
    sessionStartTimeRef.current = Date.now();
    currentSessionIdRef.current = 'sess-' + Date.now();
    setStatusMessage('Connecting to Gemini Live API WebSocket...');

    client.onTurnEvent((turn) => {
      if (turn.text.startsWith('⚠️')) {
        setStatusMessage(turn.text);
        return;
      } else if (turn.interrupted) {
        setStatusMessage('AI interrupted by user speaking.');
        return;
      } else if (turn.turnComplete) {
        // Mark the latest turn as complete and fetch its furigana readings in the background
        setTranscript((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (apiKey && !last.furiganaText && last.text.trim() && !annotatingIdsRef.current.has(last.id)) {
            annotatingIdsRef.current.add(last.id);
            evalService.generateFurigana(last.text, apiKey).then((furigana) => {
              if (furigana && furigana !== last.text) {
                setTranscript((cur) =>
                  cur.map((t) => (t.id === last.id || t.id === last.id + '-done' ? { ...t, furiganaText: furigana } : t))
                );
              }
            });
          }
          return [...prev.slice(0, -1), { ...last, id: last.id + '-done' }];
        });
        return;
      } else if (turn.text) {
        setStatusMessage(`${turn.speaker === 'user' ? 'You' : 'AI'} speaking: "${turn.text.slice(0, 40)}..."`);
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
            id: 'turn-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            speaker: turn.speaker,
            text: turn.text,
            timestamp: Date.now(),
          },
        ];
      });
    });

    try {
      await client.connect(selectedPersona, defaultLevel, apiKey);
      setIsConnected(true);
      setStatusMessage('🟢 Connected & Streaming Microphone (16kHz PCM). Speak now!');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`⚠️ Connection failed: ${err?.message || err}`);
    }
  };

  const endSession = async () => {
    clientRef.current?.disconnect();
    setIsConnected(false);

    if (transcript.length > 0) {
      const elapsed = Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
      await repository.saveSession({
        id: currentSessionIdRef.current,
        timestamp: sessionStartTimeRef.current,
        durationSeconds: elapsed,
        personaId: selectedPersona,
        jlptLevel: defaultLevel,
        transcript,
      });
    }
  };

  const handleGenerateReport = async () => {
    if (transcript.length === 0 || !apiKey) return;
    setGeneratingReport(true);
    try {
      const rep = await evalService.generateSessionReport(transcript, defaultLevel, apiKey);
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
      });
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

  const personas = personaService.getAllPersonas();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 relative">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Live Conversation Partner Studio</h2>
        <p className="text-sm text-slate-400">
          Ultra-low-latency voice conversation roleplay powered by Gemini Live API WebSockets.
        </p>
      </div>

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

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center space-y-6">
        <div className="w-full max-w-lg px-4 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-center text-xs font-mono text-slate-300">
          Status: <span className={statusMessage.startsWith('⚠️') ? 'text-amber-400 font-bold' : 'text-indigo-400'}>{statusMessage}</span>
        </div>

        <WaveformVisualizer
          inputRms={rmsLevels.inputRms}
          outputRms={rmsLevels.outputRms}
          isActive={isConnected}
        />

        {!isConnected ? (
          <button
            type="button"
            onClick={startSession}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Mic className="w-5 h-5" />
            Start Live Conversation
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={endSession}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-all"
            >
              <PhoneOff className="w-5 h-5" />
              End Conversation
            </button>
            <button
              type="button"
              onClick={() => setShowDrawer(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              Transcript Drawer
            </button>
          </div>
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
              disabled={generatingReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium"
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

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
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
    </div>
  );
};
