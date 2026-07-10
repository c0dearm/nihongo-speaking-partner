import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DrillStudioView } from './DrillStudioView';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SettingsProvider } from '../../context/SettingsContext';

describe('DrillStudioView', () => {
  const repo = new StorageRepository('test_drill_studio_db_' + Math.random());

  it('renders curated drill cards', async () => {
    render(
      <SettingsProvider>
        <DrillStudioView repository={repo} />
      </SettingsProvider>
    );
    expect(await screen.findByText(/JLPT Speaking Drills/i)).toBeInTheDocument();
  });
});
