import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('renders application title and streak counter without legacy drills tab', () => {
    render(<Header activeTab="partner" setActiveTab={() => {}} streakDays={7} />);

    expect(screen.getByText('Nihongo Speaking Partner')).toBeInTheDocument();
    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getAllByText('Live Partner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Notebook').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/JLPT Drills/i)).not.toBeInTheDocument();
  });

  it('renders navigation tabs and triggers setActiveTab on click', () => {
    const setActiveTabMock = vi.fn();
    render(<Header activeTab="partner" setActiveTab={setActiveTabMock} streakDays={3} />);

    const notebookTab = screen.getAllByText('Notebook')[0];
    fireEvent.click(notebookTab);

    expect(setActiveTabMock).toHaveBeenCalledWith('notebook');
  });

  it('renders both desktop top navigation and mobile bottom navigation tab buttons', () => {
    const setActiveTab = vi.fn();
    render(<Header activeTab="partner" setActiveTab={setActiveTab} streakDays={5} />);

    // Since both desktop and mobile navigation bars render in DOM (hidden by CSS media queries),
    // each tab label or button should be present twice (once in top nav, once in bottom nav)
    const partnerTabs = screen.getAllByText(/Live Partner/i);
    expect(partnerTabs.length).toBe(2);

    const notebookTabs = screen.getAllByText(/Notebook/i);
    expect(notebookTabs.length).toBe(2);

    // Clicking either triggers setActiveTab
    fireEvent.click(notebookTabs[1]); // Click bottom mobile nav item
    expect(setActiveTab).toHaveBeenCalledWith('notebook');
  });
});

