import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Integration', () => {
  it('renders header and allows switching between tabs across both desktop and mobile navigation bars', async () => {
    render(<App />);
    expect(screen.getByText(/Nihongo Speaking Partner/i)).toBeInTheDocument();

    // Verify both desktop and mobile tab buttons exist for Notebook
    const notebookTabs = screen.getAllByRole('button', { name: /Notebook/i });
    expect(notebookTabs.length).toBe(2);

    // Switch via top navigation (first button)
    fireEvent.click(notebookTabs[0]);
    expect(await screen.findByText(/Mistake & Vocabulary Notebook/i)).toBeInTheDocument();

    // Switch back via Dashboard on mobile navigation (second button)
    const dashboardTabs = screen.getAllByRole('button', { name: /Dashboard/i });
    expect(dashboardTabs.length).toBe(2);
    fireEvent.click(dashboardTabs[1]);
    expect(await screen.findByText(/Study Dashboard & Streaks/i)).toBeInTheDocument();
  });
});


