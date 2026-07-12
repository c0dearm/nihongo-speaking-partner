import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { JLPTLevel } from '../../types';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { Key, Upload, Download, ShieldCheck, Brain } from 'lucide-react';

interface SettingsViewProps {
  repository: StorageRepository;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ repository }) => {
  const {
    apiKey,
    setApiKey,
    defaultLevel,
    setDefaultLevel,
    furiganaEnabled,
    setFuriganaEnabled,
    adaptationMode,
    setAdaptationMode,
    suggestionsMode,
    setSuggestionsMode,
  } = useSettings();

  const [message, setMessage] = useState<string | null>(null);

  const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

  const handleExport = async () => {
    try {
      const data = await repository.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nihongo-partner-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('All study data exported successfully.');
    } catch (err) {
      console.error('Export error:', err);
      setMessage('Failed to export study data.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text =
        typeof file.text === 'function'
          ? await file.text()
          : await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsText(file);
            });
      const data = JSON.parse(text);
      await repository.importAllData(data);
      setMessage('Study data imported successfully!');
    } catch (err) {
      console.error('Import error:', err);
      setMessage('Failed to import JSON backup. Invalid file format.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Settings & Configuration</h2>
        <p className="text-sm text-slate-400">
          Manage your Gemini API key, default JLPT target level, and local study data backups.
        </p>
      </div>

      {message && (
        <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-indigo-300 text-sm">
          {message}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-200">Gemini API Key</h3>
        </div>

        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-slate-300 mb-2">
            Gemini API Key (stored securely in your browser localStorage)
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Obtain your API key from Google AI Studio. It never leaves your browser device.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-200">Study Preferences</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Default Target JLPT Level
            </label>
            <div className="flex gap-2">
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDefaultLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    defaultLevel === lvl
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Furigana Annotation Mode
            </label>
            <button
              type="button"
              onClick={() => setFuriganaEnabled(!furiganaEnabled)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                furiganaEnabled
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {furiganaEnabled ? 'Furigana Enabled (ふりがな)' : 'Kanji Only (漢字のみ)'}
            </button>
          </div>
        </div>
      </div>

      {/* AI Adaptation Mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-500/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">AI Adaptation Mode</h3>
            <p className="text-xs text-slate-400">
              Control whether the AI dynamically adapts to your personal speech and mistake history, or maintains a rigid benchmark.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              adaptationMode === 'auto'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="adaptation-mode"
              value="auto"
              checked={adaptationMode === 'auto'}
              onChange={() => setAdaptationMode('auto')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">Adaptive Learning (Auto)</span>
              <span className="text-xs text-slate-400 block mt-1">
                Recommended. AI learns from your session history and unmastered mistakes, dynamically scaling speed and vocabulary live during calls.
              </span>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              adaptationMode === 'rigid'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="adaptation-mode"
              value="rigid"
              checked={adaptationMode === 'rigid'}
              onChange={() => setAdaptationMode('rigid')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">Rigid Benchmark</span>
              <span className="text-xs text-slate-400 block mt-1">
                Strict exam practice. Locks the AI exactly to your selected JLPT level without simplifying vocabulary or speaking pace.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Speaking Suggestions Mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-500/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Speaking Suggestions Mode</h3>
            <p className="text-xs text-slate-400">
              Control when and how AI response hints appear during Target-Oriented Roleplay Missions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              suggestionsMode === 'auto'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="suggestions-mode"
              value="auto"
              checked={suggestionsMode === 'auto'}
              onChange={() => setSuggestionsMode('auto')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">Automatic (Recommended)</span>
              <span className="text-xs text-slate-400 block mt-1">
                AI automatically generates 2-3 response suggestions after every turn during missions.
              </span>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              suggestionsMode === 'manual'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="suggestions-mode"
              value="manual"
              checked={suggestionsMode === 'manual'}
              onChange={() => setSuggestionsMode('manual')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">On-Demand (Manual)</span>
              <span className="text-xs text-slate-400 block mt-1">
                Suggestions only generate when you manually click the "Get Suggestions" hint button.
              </span>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              suggestionsMode === 'off'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="suggestions-mode"
              value="off"
              checked={suggestionsMode === 'off'}
              onChange={() => setSuggestionsMode('off')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">Off (No Hints)</span>
              <span className="text-xs text-slate-400 block mt-1">
                Hides the suggestions panel completely for unassisted immersion and maximum challenge.
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-slate-200">Local Data Backup & Migration</h3>


        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export All Study Data (JSON)
          </button>

          <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Backup JSON
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
