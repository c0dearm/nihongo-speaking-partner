import React, { useState } from 'react';
import { RoleplayScenarioService } from '../../services/scenarios/RoleplayScenarioService';
import { RoleplayScenario } from '../../types';
import { X, Target, PlusCircle } from 'lucide-react';

interface CreateCustomScenarioModalProps {
  isOpen?: boolean;
  onClose: () => void;
  scenarioService?: RoleplayScenarioService;
  onScenarioCreated?: (scenario: RoleplayScenario) => void;
  onCreate?: (scenario: RoleplayScenario) => Promise<void>;
}

export const CreateCustomScenarioModal: React.FC<CreateCustomScenarioModalProps> = ({
  isOpen = true,
  onClose,
  scenarioService,
  onScenarioCreated,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'dining' | 'travel' | 'daily_life' | 'business' | 'emergency'>('daily_life');
  const [goalDescription, setGoalDescription] = useState('');
  const [userRole, setUserRole] = useState('');
  const [aiRole, setAiRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isOpen === false) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !goalDescription.trim() || !userRole.trim() || !aiRole.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (scenarioService && onScenarioCreated) {
        const created = await scenarioService.createCustomScenario(
          title,
          category,
          goalDescription,
          userRole,
          aiRole
        );
        onScenarioCreated(created);
      } else if (onCreate) {
        const created: RoleplayScenario = {
          id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          title: title.trim(),
          category,
          goalDescription: goalDescription.trim(),
          userRole: userRole.trim(),
          aiRole: aiRole.trim(),
          isCustom: true,
        };
        await onCreate(created);
      }
      setTitle('');
      setGoalDescription('');
      setUserRole('');
      setAiRole('');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create custom mission scenario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5 text-indigo-400">
            <Target className="w-5 h-5" />
            <h3 className="text-lg font-bold text-slate-100">Create Custom Roleplay Mission</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="mission-title" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mission Title *
            </label>
            <input
              id="mission-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Asking for directions to the post office"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="mission-category" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Category *
            </label>
            <select
              id="mission-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as RoleplayScenario['category'])}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="daily_life">Daily Life</option>
              <option value="dining">Dining & Food</option>
              <option value="travel">Travel & Transit</option>
              <option value="business">Business & Work</option>
              <option value="emergency">Emergency & Help</option>
            </select>
          </div>

          <div>
            <label htmlFor="user-role" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your Role (Student) *
            </label>
            <input
              id="user-role"
              type="text"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              placeholder="e.g., Lost tourist walking around Shibuya"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="ai-role" className="block text-xs font-semibold text-slate-300 mb-1.5">
              AI Partner Role *
            </label>
            <input
              id="ai-role"
              type="text"
              value={aiRole}
              onChange={(e) => setAiRole(e.target.value)}
              placeholder="e.g., Friendly local police officer at a Koban"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="goal-description" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Secret Goal / Mission Objective *
            </label>
            <textarea
              id="goal-description"
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              rows={3}
              placeholder="e.g., Ask where the nearest post office is, find out if it is open on weekends, and ask how many minutes walking distance it takes from here."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
