import React from 'react';
import { Mic, BookMarked, LayoutDashboard, Settings } from 'lucide-react';

export type ActiveTab = 'partner' | 'notebook' | 'dashboard' | 'settings';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  streakDays: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, streakDays }) => {
  const tabs = [
    { id: 'partner', label: 'Live Partner', icon: Mic },
    { id: 'notebook', label: 'Notebook', icon: BookMarked },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            日
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base">Nihongo Speaking Partner</h1>
            <p className="text-xs text-slate-400">Daily Japanese Speaking Studio</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold">
          <span>🔥</span>
          <span>{streakDays} Days</span>
        </div>
      </div>
    </header>
  );
};
