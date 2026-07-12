import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Integration', () => {
  it('renders header and allows switching between tabs', async () => {
    render(<App />);
    expect(screen.getByText(/Nihongo Speaking Partner/i)).toBeInTheDocument();

    const notebookTab = screen.getByRole('button', { name: /Notebook/i });
    fireEvent.click(notebookTab);
    expect(await screen.findByText(/Mistake & Vocabulary Notebook/i)).toBeInTheDocument();
  });
});

