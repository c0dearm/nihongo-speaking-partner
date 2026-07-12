import React, { useEffect, useState } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { NotebookItemRecord, JLPTLevel } from '../../types';
import { Volume2, Trash2, CheckCircle, Search } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { renderFurigana } from '../../utils/furigana';

interface NotebookViewProps {
  repository: StorageRepository;
}

export const NotebookView: React.FC<NotebookViewProps> = ({ repository }) => {
  const { furiganaEnabled, setFuriganaEnabled } = useSettings();
  const [items, setItems] = useState<NotebookItemRecord[]>([]);
  const [filterLevel, setFilterLevel] = useState<JLPTLevel | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'grammar' | 'vocabulary' | 'pronunciation'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadItems = async () => {
    const list = await repository.getNotebookItems();
    setItems(list);
  };

  useEffect(() => {
    loadItems();
  }, [repository]);

  const handleDelete = async (id: string) => {
    await repository.deleteNotebookItem(id);
    await loadItems();
  };

  const handleToggleMastered = async (item: NotebookItemRecord) => {
    await repository.saveNotebookItem({ ...item, mastered: !item.mastered });
    await loadItems();
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterLevel !== 'ALL' && item.jlptLevel !== filterLevel) return false;
    if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.originalText.toLowerCase().includes(q) ||
        item.correctedText.toLowerCase().includes(q) ||
        item.explanation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Mistake & Vocabulary Notebook</h2>
          <p className="text-sm text-slate-400">Revisit and master your saved grammar corrections, natural phrasing recasts, and vocabulary.</p>
        </div>

        <button
          type="button"
          onClick={() => setFuriganaEnabled(!furiganaEnabled)}
          className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
            furiganaEnabled
              ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          Furigana: {furiganaEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notebook notes..."
            className="bg-transparent text-sm text-slate-200 focus:outline-none w-full"
          />
        </div>

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as JLPTLevel | 'ALL')}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="ALL">All Levels</option>
          <option value="N5">JLPT N5</option>
          <option value="N4">JLPT N4</option>
          <option value="N3">JLPT N3</option>
          <option value="N2">JLPT N2</option>
          <option value="N1">JLPT N1</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) =>
            setFilterCategory(
              e.target.value as 'ALL' | 'grammar' | 'vocabulary' | 'pronunciation'
            )
          }
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="ALL">All Categories</option>
          <option value="grammar">Grammar Corrections</option>
          <option value="vocabulary">Vocabulary</option>
          <option value="pronunciation">Pronunciation</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">No saved mistakes or vocabulary items found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-xl p-5 transition-colors ${
                item.mastered ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-500/30">
                      {item.jlptLevel}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                      {item.category}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Your Attempt / Original:</p>
                    <div className="text-sm text-rose-400 line-through leading-relaxed">{renderFurigana(item.originalText, furiganaEnabled)}</div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Native Recast / Corrected:</p>
                    <div className="text-lg font-semibold text-emerald-400 leading-relaxed">
                      {renderFurigana(item.furiganaText || item.correctedText, furiganaEnabled)}
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
                    {item.explanation}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSpeak(item.correctedText)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Speak Corrected Sentence"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleMastered(item)}
                    className={`p-2 rounded-lg transition-colors ${
                      item.mastered
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                    }`}
                    title="Mark as Mastered"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
