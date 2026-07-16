import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';

const TestConsumer: React.FC = () => {
  const { initiator, setInitiator } = useSettings();
  return (
    <div>
      <span data-testid="initiator">{initiator}</span>
      <button data-testid="set-user-first" onClick={() => setInitiator('user_first')}>Set User First</button>
    </div>
  );
};

describe('SettingsContext extensions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default initiator (ai_first) and allows updating it', () => {
    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    expect(screen.getByTestId('initiator').textContent).toBe('ai_first');

    fireEvent.click(screen.getByTestId('set-user-first'));
    expect(screen.getByTestId('initiator').textContent).toBe('user_first');
    expect(localStorage.getItem('nihongo_initiator')).toBe('user_first');
  });
});
