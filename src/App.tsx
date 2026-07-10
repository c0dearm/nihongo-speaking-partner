import React, { useState, useEffect } from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { Header, ActiveTab } from './components/layout/Header';
import { LivePartnerView } from './components/partner/LivePartnerView';
import { DrillStudioView } from './components/drills/DrillStudioView';
import { NotebookView } from './components/notebook/NotebookView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { StorageRepository } from './services/storage/StorageRepository';

const repository = new StorageRepository();

const MainContent: React.FC = () => {
  const { apiKey } = useSettings();
  const [activeTab, setActiveTab] = useState<ActiveTab>('partner');
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    repository.getUserStats().then((stats) => {
      setStreakDays(stats.dailyStreak);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} streakDays={streakDays} />

      {!apiKey && activeTab !== 'settings' && (
        <div className="max-w-5xl mx-auto w-full px-4 mt-6">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <p className="text-sm text-amber-300">
              Gemini API Key is not configured yet. Configure your API key to enable live voice speaking practice.
            </p>
            <button
              onClick={() => setActiveTab('settings')}
              className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium"
            >
              Go to Settings
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeTab === 'partner' && <LivePartnerView repository={repository} />}
        {activeTab === 'drills' && <DrillStudioView repository={repository} />}
        {activeTab === 'notebook' && <NotebookView repository={repository} />}
        {activeTab === 'dashboard' && <DashboardView repository={repository} />}
        {activeTab === 'settings' && <SettingsView repository={repository} />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <MainContent />
    </SettingsProvider>
  );
}

