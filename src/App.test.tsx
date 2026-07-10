import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Smoke Test', () => {
  it('renders the application title', () => {
    render(<App />);
    expect(screen.getByText(/Nihongo Speaking Partner/i)).toBeInTheDocument();
  });
});
