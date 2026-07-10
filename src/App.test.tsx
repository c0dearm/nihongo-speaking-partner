import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Integration', () => {
  it('renders header and allows switching between tabs', async () => {
    render(<App />);
    expect(screen.getByText(/Nihongo Speaking Partner/i)).toBeInTheDocument();

    const drillsTab = screen.getByRole('button', { name: /JLPT Drills/i });
    fireEvent.click(drillsTab);
    expect(await screen.findByText(/JLPT Speaking Drills/i)).toBeInTheDocument();
  });
});

