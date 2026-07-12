import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('renders application title and streak counter without legacy drills tab', () => {
    render(<Header activeTab="partner" setActiveTab={() => {}} streakDays={7} />);

    expect(screen.getByText('Nihongo Speaking Partner')).toBeInTheDocument();
    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getByText('Live Partner')).toBeInTheDocument();
    expect(screen.getByText('Notebook')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText(/JLPT Drills/i)).not.toBeInTheDocument();
  });

  it('renders navigation tabs and triggers setActiveTab on click', () => {
    const setActiveTabMock = vi.fn();
    render(<Header activeTab="partner" setActiveTab={setActiveTabMock} streakDays={3} />);

    const notebookTab = screen.getByText('Notebook');
    fireEvent.click(notebookTab);

    expect(setActiveTabMock).toHaveBeenCalledWith('notebook');
  });
});
