import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('renders application title and streak counter', () => {
    render(<Header activeTab="partner" setActiveTab={() => {}} streakDays={7} />);

    expect(screen.getByText('Nihongo Speaking Partner')).toBeInTheDocument();
    expect(screen.getByText('7 Days')).toBeInTheDocument();
  });

  it('renders navigation tabs and triggers setActiveTab on click', () => {
    const setActiveTabMock = vi.fn();
    render(<Header activeTab="partner" setActiveTab={setActiveTabMock} streakDays={3} />);

    const drillsTab = screen.getByText('JLPT Drills');
    fireEvent.click(drillsTab);

    expect(setActiveTabMock).toHaveBeenCalledWith('drills');
  });
});
