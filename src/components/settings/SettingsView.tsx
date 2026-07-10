import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { JLPTLevel } from '../../types';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { Key, Upload, Download, ShieldCheck } from 'lucide-react';

interface SettingsViewProps {
  repository: StorageRepository;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ repository }) => {
  const { apiKey, setApiKey, defaultLevel, setDefaultLevel, furiganaEnabled, setFuriganaEnabled } =
    useSettings();

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
