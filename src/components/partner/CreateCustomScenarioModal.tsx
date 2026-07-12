import React, { useState } from 'react';
import { RoleplayScenario, JLPTLevel } from '../../types';
import { X, Plus } from 'lucide-react';

interface CreateCustomScenarioModalProps {
  onClose: () => void;
  onCreate: (scenario: RoleplayScenario) => Promise<void>;
}

export const CreateCustomScenarioModal: React.FC<CreateCustomScenarioModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [jlptLevel, setJlptLevel] = useState<JLPTLevel>('N4');
  const [category, setCategory] = useState<'dining' | 'travel' | 'business' | 'daily_life' | 'emergency'>('dining');
  const [goalDescription, setGoalDescription] = useState('');
  const [userRole, setUserRole] = useState('');
  const [aiRole, setAiRole] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !goalDescription.trim() || !userRole.trim() || !aiRole.trim()) return;

    setSubmitting(true);
    try {
      const scenario: RoleplayScenario = {
        id: 'custom-scenario-' + Date.now(),
        title: title.trim(),
        jlptLevel,
        category,
        goalDescription: goalDescription.trim(),
        userRole: userRole.trim(),
        aiRole: aiRole.trim(),
        isCustom: true,
      };
      await onCreate(scenario);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save custom mission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100">Create Custom Roleplay Mission</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label htmlFor="mission-title" className="block text-xs font-semibold text-slate-400 mb-1">
              Mission Title
            </label>
            <input
              id="mission-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Renting a Bicycle in Kyoto"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="target-jlpt-level" className="block text-xs font-semibold text-slate-400 mb-1">
                Target JLPT Level
              </label>
              <select
                id="target-jlpt-level"
                value={jlptLevel}
                onChange={(e) => setJlptLevel(e.target.value as JLPTLevel)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="N5">JLPT N5</option>
                <option value="N4">JLPT N4</option>
                <option value="N3">JLPT N3</option>
                <option value="N2">JLPT N2</option>
                <option value="N1">JLPT N1</option>
              </select>
            </div>

            <div>
              <label htmlFor="mission-category" className="block text-xs font-semibold text-slate-400 mb-1">
                Category
              </label>
              <select
                id="mission-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="dining">Dining & Izakaya</option>
                <option value="travel">Travel & Hotels</option>
                <option value="daily_life">Daily Life & Shopping</option>
                <option value="business">Workplace & Business</option>
                <option value="emergency">Emergencies & Help</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="secret-goal" className="block text-xs font-semibold text-slate-400 mb-1">
              Secret Conversation Goal
            </label>
            <textarea
              id="secret-goal"
              required
              rows={2}
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              placeholder="e.g. Rent an electric bicycle for 3 days and ask about lock procedures."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="your-role" className="block text-xs font-semibold text-slate-400 mb-1">
                Your Role
              </label>
              <input
                id="your-role"
                type="text"
                required
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                placeholder="e.g. Tourist"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="ai-role" className="block text-xs font-semibold text-slate-400 mb-1">
                AI Partner Role
              </label>
              <input
                id="ai-role"
                type="text"
                required
                value={aiRole}
                onChange={(e) => setAiRole(e.target.value)}
                placeholder="e.g. Rental Shop Clerk"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save & Select Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
