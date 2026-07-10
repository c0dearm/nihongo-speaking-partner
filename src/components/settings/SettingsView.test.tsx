import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsProvider } from '../../context/SettingsContext';
import { SettingsView } from './SettingsView';
import { StorageRepository } from '../../services/storage/StorageRepository';

describe('SettingsView', () => {
  const repo = new StorageRepository('test_settings_db_' + Math.random());

  it('allows entering and saving an API key', () => {
    render(
      <SettingsProvider>
        <SettingsView repository={repo} />
      </SettingsProvider>
    );

    const input = screen.getByLabelText(/Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AIzaSyTestKey123' } });

    expect(screen.getByDisplayValue('AIzaSyTestKey123')).toBeInTheDocument();
  });

  it('allows changing the default JLPT level', () => {
    render(
      <SettingsProvider>
        <SettingsView repository={repo} />
      </SettingsProvider>
    );

    const n2Button = screen.getByText('N2');
    fireEvent.click(n2Button);

    expect(n2Button).toHaveClass('bg-indigo-600');
  });

  it('allows toggling Furigana mode', () => {
    render(
      <SettingsProvider>
        <SettingsView repository={repo} />
      </SettingsProvider>
    );

    const furiganaBtn = screen.getByText(/Furigana Enabled/i);
    fireEvent.click(furiganaBtn);

    expect(screen.getByText(/Kanji Only/i)).toBeInTheDocument();
  });

  it('exports study data when export button is clicked', async () => {
    const createObjectURLMock = vi.fn(() => 'blob:test-url');
    const revokeObjectURLMock = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;

    render(
      <SettingsProvider>
        <SettingsView repository={repo} />
      </SettingsProvider>
    );

    const exportBtn = screen.getByText(/Export All Study Data/i);
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText('All study data exported successfully.')).toBeInTheDocument();
    });

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('imports valid JSON backup study data', async () => {
    render(
      <SettingsProvider>
        <SettingsView repository={repo} />
      </SettingsProvider>
    );

    const input = screen.getByLabelText(/Import Backup JSON/i);
    const validJson = JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      sessions: [],
      drillsProgress: [],
      notebookItems: [],
      customDrills: [],
      userStats: { dailyStreak: 5, lastPracticeDate: '2026-07-10', totalMinutesPracticed: 60, dailyGoalMinutes: 15 },
    });
    const file = new File([validJson], 'backup.json', { type: 'application/json' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/Study data imported successfully!/i)).toBeInTheDocument();
  });
});
