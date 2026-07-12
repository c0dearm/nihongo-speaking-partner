import React, { useEffect, useState, useRef } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { DrillService } from '../../services/drills/DrillService';
import { EvaluationService } from '../../services/ai/EvaluationService';
import { DrillPrompt, JLPTLevel, SpeakingAssessment } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { CreateCustomDrillModal } from './CreateCustomDrillModal';
import { renderFurigana } from '../../utils/furigana';
import { Plus, Sparkles, BookPlus, Mic, MicOff } from 'lucide-react';

interface DrillStudioViewProps {
  repository: StorageRepository;
}

export const DrillStudioView: React.FC<DrillStudioViewProps> = ({ repository }) => {
  const { apiKey, defaultLevel, furiganaEnabled, setFuriganaEnabled } = useSettings();
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel>(defaultLevel);
  const [drills, setDrills] = useState<DrillPrompt[]>([]);
  const [selectedDrill, setSelectedDrill] = useState<DrillPrompt | null>(null);
  const [userSpeechText, setUserSpeechText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [assessment, setAssessment] = useState<SpeakingAssessment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userSpeechFurigana, setUserSpeechFurigana] = useState<string | null>(null);
  const [annotatingSpeech, setAnnotatingSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);

  const drillService = new DrillService(repository);
  const evalService = new EvaluationService();

  useEffect(() => {
    if (!furiganaEnabled || !apiKey || !userSpeechText.trim()) {
      setUserSpeechFurigana(null);
      return;
    }
    setAnnotatingSpeech(true);
    const timer = setTimeout(() => {
      evalService.generateFurigana(userSpeechText, apiKey).then((furigana) => {
        setUserSpeechFurigana(furigana);
        setAnnotatingSpeech(false);
      });
    }, 600);
    return () => {
      clearTimeout(timer);
      setAnnotatingSpeech(false);
    };
  }, [userSpeechText, furiganaEnabled, apiKey]);

  const toggleDictation = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      alert('Your browser does not support the Web Speech API dictation. Please use your operating system dictation shortcut (e.g. Win+H or Cmd+Double-Tap Ctrl) or type manually.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ja-JP';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setUserSpeechText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const loadDrills = async (level: JLPTLevel) => {
    const list = await drillService.getDrillsByLevel(level);
    setDrills(list);
  };

  useEffect(() => {
    loadDrills(selectedLevel);
  }, [selectedLevel]);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrill || !userSpeechText.trim()) return;
    if (!apiKey) {
      alert('Please configure your Gemini API Key in Settings first.');
      return;
    }

    setEvaluating(true);
    try {
      const result = await evalService.evaluateSpeech(
        userSpeechText,
        `${selectedDrill.title}: ${selectedDrill.promptText} (Target Grammar: ${selectedDrill.targetGrammar})`,
        selectedDrill.jlptLevel,
        apiKey
      );

      setAssessment(result);

      await repository.saveDrillProgress({
        id: 'progress-' + Date.now(),
        drillId: selectedDrill.id,
        jlptLevel: selectedDrill.jlptLevel,
        completedAt: Date.now(),
        assessment: result,
      });
    } catch (err) {
      console.error('Evaluation error:', err);
      alert('Failed to evaluate speech response. Check API key.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleAddToNotebook = async () => {
    if (!assessment || !selectedDrill) return;
    await repository.saveNotebookItem({
      id: 'note-' + Date.now(),
      createdAt: Date.now(),
      category: 'grammar',
      jlptLevel: selectedDrill.jlptLevel,
      originalText: assessment.userTranscript,
      correctedText: assessment.nativeRecast.japanese,
      furiganaText: assessment.nativeRecast.furigana,
      explanation:
        assessment.grammarCorrections[0]?.explanation ||
        `Native recast for prompt: ${selectedDrill.title}`,
      mastered: false,
    });
    alert('Saved to your Mistake & Vocabulary Notebook!');
  };

  const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">JLPT Speaking Drills</h2>
          <p className="text-sm text-slate-400">
            Structured prompt exercises with instant grammar & naturalness scoring.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Custom Prompt
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {levels.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSelectedLevel(lvl)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedLevel === lvl
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            JLPT {lvl}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {drills.map((drill) => (
          <div
            key={drill.id}
            onClick={() => {
              setSelectedDrill(drill);
              setAssessment(null);
              setUserSpeechText('');
              setUserSpeechFurigana(null);
            }}
            className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-500/30">
                {drill.jlptLevel}
              </span>
              <span className="text-xs text-slate-400 uppercase">{drill.category}</span>
            </div>

            <h3 className="font-semibold text-slate-100">{drill.title}</h3>
            <p className="text-sm text-slate-400 line-clamp-2">{drill.promptText}</p>
            <p className="text-xs text-indigo-400 font-mono">Target: {drill.targetGrammar}</p>
          </div>
        ))}
      </div>

      {selectedDrill && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-indigo-400 font-semibold">{selectedDrill.jlptLevel} Drill</span>
                <h3 className="text-xl font-bold text-slate-100">{selectedDrill.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDrill(null)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <p className="text-sm font-medium text-slate-200">{selectedDrill.promptText}</p>
              <p className="text-xs text-indigo-400">Target Grammar: {selectedDrill.targetGrammar}</p>
            </div>

            {!assessment ? (
              <form onSubmit={handleEvaluate} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <label className="block text-xs font-medium text-slate-400">
                      Your Spoken Response (Dictate in Japanese or type below)
                    </label>
                    <button
                      type="button"
                      onClick={toggleDictation}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isListening
                          ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-600/30'
                          : 'bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" />
                          Stop Dictation (Listening...)
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          Dictate via Microphone (ja-JP)
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={userSpeechText}
                    onChange={(e) => setUserSpeechText(e.target.value)}
                    placeholder="Click 'Dictate via Microphone' and speak your answer in Japanese, or type here..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200"
                  />
                  {userSpeechText.trim() && (
                    <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Live Response Preview (with Furigana reading aids):</span>
                        {annotatingSpeech && <span className="text-indigo-400 animate-pulse">Adding readings...</span>}
                      </div>
                      <div className="text-base font-medium text-slate-100 leading-relaxed">
                        {renderFurigana(userSpeechFurigana || userSpeechText, furiganaEnabled)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={evaluating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    {evaluating ? 'Evaluating with Gemini...' : 'Evaluate Speaking Response'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-indigo-400">Speaking Assessment</span>
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
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-lg text-center border border-slate-800">
                    <p className="text-xs text-slate-400">Overall Score</p>
                    <p className="text-2xl font-bold text-indigo-400">{assessment.overallScore}/100</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg text-center border border-slate-800">
                    <p className="text-xs text-slate-400">Grammar</p>
                    <p className="text-2xl font-bold text-emerald-400">{assessment.grammarScore}/100</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg text-center border border-slate-800">
                    <p className="text-xs text-slate-400">Natural Phrasing</p>
                    <p className="text-2xl font-bold text-amber-400">{assessment.naturalnessScore}/100</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400">Native Recast (Better Phrasing):</p>
                  <div className="text-base font-semibold text-emerald-400 leading-relaxed">
                    {renderFurigana(assessment.nativeRecast.furigana || assessment.nativeRecast.japanese, furiganaEnabled)}
                  </div>
                  <p className="text-xs text-slate-400">{assessment.nativeRecast.english}</p>
                </div>

                {assessment.keyVocabulary && assessment.keyVocabulary.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400">Key Vocabulary:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {assessment.keyVocabulary.map((vocab, i) => (
                        <div key={i} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-200">
                            {renderFurigana(`${vocab.word}(${vocab.reading})`, furiganaEnabled)}
                          </span>
                          <span className="text-slate-400">{vocab.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleAddToNotebook}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium"
                  >
                    <BookPlus className="w-4 h-4" />
                    Save to Notebook
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessment(null)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
                  >
                    Try Another Drill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateCustomDrillModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (drill) => {
            await drillService.createCustomDrill(drill);
            setSelectedLevel(drill.jlptLevel);
            await loadDrills(drill.jlptLevel);
          }}
        />
      )}
    </div>
  );
};
