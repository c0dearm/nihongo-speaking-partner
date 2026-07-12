import React, { useEffect, useState } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SessionRecord, UserStatsRecord } from '../../types';
import { Flame, Clock, Target, TrendingUp } from 'lucide-react';

interface DashboardViewProps {
  repository: StorageRepository;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ repository }) => {
  const [stats, setStats] = useState<UserStatsRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [s, sess] = await Promise.all([
        repository.getUserStats(),
        repository.getSessions(),
      ]);
      if (active) {
        setStats(s);
        setSessions(sess);
      }
    })();
    return () => {
      active = false;
    };
  }, [repository]);

  if (!stats) {
    return <div className="p-8 text-center text-slate-400">Loading study dashboard...</div>;
  }

  const missionSessions = sessions.filter((s) => Boolean(s.scenarioId || s.feedbackReport?.goalVerdict));
  const successfulMissions = missionSessions.filter(
    (s) =>
      s.feedbackReport?.goalVerdict?.status === 'ACHIEVED' ||
      s.feedbackReport?.goalVerdict?.status === 'PARTIALLY_ACHIEVED'
  ).length;
  const missionSuccessRate =
    missionSessions.length > 0
      ? Math.round((successfulMissions / missionSessions.length) * 100)
      : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Study Dashboard & Streaks</h2>
        <p className="text-sm text-slate-400">
          Track your daily Japanese speaking activity and overall JLPT level proficiency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Current Streak</p>
            <p className="text-2xl font-bold text-slate-100">{stats.dailyStreak} Days</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Practice Time</p>
            <p className="text-2xl font-bold text-slate-100">{stats.totalMinutesPracticed} mins</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-950/60 rounded-xl text-indigo-400 border border-indigo-500/30">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Roleplay Missions</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{missionSessions.length}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-950/60 rounded-xl text-emerald-400 border border-emerald-500/30">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mission Success Rate</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{missionSessions.length > 0 ? `${missionSuccessRate}%` : '—'}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">Daily Speaking Goal</h3>
        <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800">
          <div
            className="bg-indigo-600 h-full transition-all duration-300"
            style={{
              width: `${
                stats.dailyGoalMinutes > 0
                  ? Math.min(100, (stats.totalMinutesPracticed / stats.dailyGoalMinutes) * 100)
                  : 0
              }%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-400">
          Practiced {stats.totalMinutesPracticed} mins out of your {stats.dailyGoalMinutes} min daily goal.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">Recent Speaking Sessions</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No past live partner sessions recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {sessions.map((s) => (
              <div key={s.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    JLPT {s.jlptLevel} Partner Session ({s.personaId})
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(s.timestamp).toLocaleDateString()} — {Math.round(s.durationSeconds / 60)} mins
                  </p>
                </div>
                {s.feedbackReport && (
                  <span className="text-xs px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                    Est. Level: {s.feedbackReport.estimatedLevel}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
