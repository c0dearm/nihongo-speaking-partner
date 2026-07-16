import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';

const TestConsumer: React.FC = () => {
  const { speakingSpeed, setSpeakingSpeed, initiator, setInitiator } = useSettings();
  return (
    <div>
      <span data-testid="speaking-speed">{speakingSpeed}</span>
      <button data-testid="set-slow" onClick={() => setSpeakingSpeed('slow')}>Set Slow</button>
      <span data-testid="initiator">{initiator}</span>
      <button data-testid="set-user-first" onClick={() => setInitiator('user_first')}>Set User First</button>
    </div>
  );
};

describe('SettingsContext extensions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default speakingSpeed (auto) and initiator (ai_first) and allows updating them', () => {
    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    expect(screen.getByTestId('speaking-speed').textContent).toBe('auto');
    expect(screen.getByTestId('initiator').textContent).toBe('ai_first');

    fireEvent.click(screen.getByTestId('set-slow'));
    expect(screen.getByTestId('speaking-speed').textContent).toBe('slow');
    expect(localStorage.getItem('nihongo_speaking_speed')).toBe('slow');

    fireEvent.click(screen.getByTestId('set-user-first'));
    expect(screen.getByTestId('initiator').textContent).toBe('user_first');
    expect(localStorage.getItem('nihongo_initiator')).toBe('user_first');
  });
});
