import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotebookView } from './NotebookView';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SettingsProvider } from '../../context/SettingsContext';
import { NotebookItemRecord } from '../../types';

describe('NotebookView', () => {
  let repo: StorageRepository;

  beforeEach(() => {
    repo = new StorageRepository('test_notebook_db_' + Math.random());
  });

  const renderWithSettings = (ui: React.ReactElement) => {
    return render(<SettingsProvider>{ui}</SettingsProvider>);
  };

  it('renders empty notebook state when no entries exist', async () => {
    renderWithSettings(<NotebookView repository={repo} />);
    expect(
      await screen.findByText(/No saved mistakes or vocabulary items found matching your filters/i)
    ).toBeInTheDocument();
  });

  it('renders saved notebook items with original, corrected text, explanation and tags', async () => {
    const item: NotebookItemRecord = {
      id: 'note-1',
      createdAt: Date.now(),
      category: 'grammar',
      jlptLevel: 'N3',
      originalText: '私は行くでした',
      correctedText: '私は行きました',
      furiganaText: '私[わたし]は行[い]きました',
      explanation: 'Use polite past tense form.',
      mastered: false,
    };
    await repo.saveNotebookItem(item);

    renderWithSettings(<NotebookView repository={repo} />);

    expect(await screen.findByText('私は行くでした')).toBeInTheDocument();
    expect(screen.getByText('Use polite past tense form.')).toBeInTheDocument();
    expect(screen.getByText('N3')).toBeInTheDocument();
    expect(screen.getByText('grammar')).toBeInTheDocument();
  });

  it('filters items by JLPT level and category', async () => {
    const item1: NotebookItemRecord = {
      id: 'note-n3-grammar',
      createdAt: Date.now() - 1000,
      category: 'grammar',
      jlptLevel: 'N3',
      originalText: 'N3 grammar original',
      correctedText: 'N3 grammar corrected',
      furiganaText: '',
      explanation: 'N3 explanation',
      mastered: false,
    };
    const item2: NotebookItemRecord = {
      id: 'note-n2-vocab',
      createdAt: Date.now(),
      category: 'vocabulary',
      jlptLevel: 'N2',
      originalText: 'N2 vocab original',
      correctedText: 'N2 vocab corrected',
      furiganaText: '',
      explanation: 'N2 explanation',
      mastered: false,
    };
    await repo.saveNotebookItem(item1);
    await repo.saveNotebookItem(item2);

    renderWithSettings(<NotebookView repository={repo} />);

    expect(await screen.findByText('N3 grammar original')).toBeInTheDocument();
    expect(screen.getByText('N2 vocab original')).toBeInTheDocument();

    // Filter by level N3
    const levelSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(levelSelect, { target: { value: 'N3' } });

    await waitFor(() => {
      expect(screen.getByText('N3 grammar original')).toBeInTheDocument();
      expect(screen.queryByText('N2 vocab original')).not.toBeInTheDocument();
    });

    // Reset level filter and filter by category vocabulary
    fireEvent.change(levelSelect, { target: { value: 'ALL' } });
    const categorySelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(categorySelect, { target: { value: 'vocabulary' } });

    await waitFor(() => {
      expect(screen.queryByText('N3 grammar original')).not.toBeInTheDocument();
      expect(screen.getByText('N2 vocab original')).toBeInTheDocument();
    });
  });

  it('searches items by query string', async () => {
    const item1: NotebookItemRecord = {
      id: 'note-1',
      createdAt: Date.now() - 1000,
      category: 'grammar',
      jlptLevel: 'N4',
      originalText: 'apple pie',
      correctedText: 'りんごパイ',
      furiganaText: '',
      explanation: 'delicious fruit',
      mastered: false,
    };
    const item2: NotebookItemRecord = {
      id: 'note-2',
      createdAt: Date.now(),
      category: 'vocabulary',
      jlptLevel: 'N4',
      originalText: 'banana juice',
      correctedText: 'バナナジュース',
      furiganaText: '',
      explanation: 'refreshing drink',
      mastered: false,
    };
    await repo.saveNotebookItem(item1);
    await repo.saveNotebookItem(item2);

    renderWithSettings(<NotebookView repository={repo} />);

    expect(await screen.findByText('apple pie')).toBeInTheDocument();
    expect(screen.getByText('banana juice')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search notebook notes.../i);
    fireEvent.change(searchInput, { target: { value: 'banana' } });

    await waitFor(() => {
      expect(screen.queryByText('apple pie')).not.toBeInTheDocument();
      expect(screen.getByText('banana juice')).toBeInTheDocument();
    });
  });

  it('toggles mastered status of a notebook item', async () => {
    const item: NotebookItemRecord = {
      id: 'note-toggle',
      createdAt: Date.now(),
      category: 'grammar',
      jlptLevel: 'N3',
      originalText: 'unmastered note',
      correctedText: 'corrected text',
      furiganaText: '',
      explanation: 'explanation text',
      mastered: false,
    };
    await repo.saveNotebookItem(item);

    renderWithSettings(<NotebookView repository={repo} />);

    const masteredBtn = await screen.findByTitle('Mark as Mastered');
    fireEvent.click(masteredBtn);

    await waitFor(async () => {
      const saved = await repo.getNotebookItems();
      expect(saved[0].mastered).toBe(true);
    });
  });

  it('deletes a notebook item when delete button is clicked', async () => {
    const item: NotebookItemRecord = {
      id: 'note-delete',
      createdAt: Date.now(),
      category: 'grammar',
      jlptLevel: 'N3',
      originalText: 'note to delete',
      correctedText: 'corrected text',
      furiganaText: '',
      explanation: 'explanation text',
      mastered: false,
    };
    await repo.saveNotebookItem(item);

    renderWithSettings(<NotebookView repository={repo} />);

    expect(await screen.findByText('note to delete')).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Delete Note');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('note to delete')).not.toBeInTheDocument();
    });
  });

  it('calls window.speechSynthesis.speak when speak button is clicked', async () => {
    const speakMock = vi.fn();
    const utteranceMock = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', function (this: any, text: string) {
      this.text = text;
      utteranceMock(text);
    } as any);
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: speakMock },
      writable: true,
      configurable: true,
    });

    const item: NotebookItemRecord = {
      id: 'note-speak',
      createdAt: Date.now(),
      category: 'pronunciation',
      jlptLevel: 'N5',
      originalText: 'hello',
      correctedText: 'こんにちは',
      furiganaText: '',
      explanation: 'greeting',
      mastered: false,
    };
    await repo.saveNotebookItem(item);

    renderWithSettings(<NotebookView repository={repo} />);

    const speakBtn = await screen.findByTitle('Speak Corrected Sentence');
    fireEvent.click(speakBtn);

    expect(utteranceMock).toHaveBeenCalledWith('こんにちは');
    expect(speakMock).toHaveBeenCalled();
  });
});
