import React, { useState } from 'react';
import { DrillPrompt, JLPTLevel } from '../../types';

interface CreateCustomDrillModalProps {
  onClose: () => void;
  onCreate: (drill: DrillPrompt) => void;
}

export const CreateCustomDrillModal: React.FC<CreateCustomDrillModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [targetGrammar, setTargetGrammar] = useState('');
  const [jlptLevel, setJlptLevel] = useState<JLPTLevel>('N4');
  const [category, setCategory] = useState<'scenario' | 'transformation' | 'shadowing'>('scenario');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !promptText) return;

    onCreate({
      id: 'custom-' + Date.now(),
      jlptLevel,
      category,
      title,
      promptText,
      targetGrammar,
      isCustom: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-6">
        <h3 className="text-lg font-bold text-slate-100">Create Custom Speaking Prompt</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Asking for leave politely"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">JLPT Level</label>
              <select
                value={jlptLevel}
                onChange={(e) => setJlptLevel(e.target.value as JLPTLevel)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DrillPrompt['category'])}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="scenario">Scenario Response</option>
                <option value="transformation">Grammar Transformation</option>
                <option value="shadowing">Shadowing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Prompt Instructions</label>
            <textarea
              required
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={3}
              placeholder="Describe the situation or prompt..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Target Grammar Pattern</label>
            <input
              type="text"
              value={targetGrammar}
              onChange={(e) => setTargetGrammar(e.target.value)}
              placeholder="〜てもいいですか"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
            >
              Create Prompt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
