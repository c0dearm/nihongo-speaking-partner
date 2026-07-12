import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateCustomScenarioModal } from './CreateCustomScenarioModal';

describe('CreateCustomScenarioModal', () => {
  it('renders input fields and submits custom scenario', () => {
    const onCreate = vi.fn();
    const onClose = vi.fn();

    render(<CreateCustomScenarioModal onClose={onClose} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/Mission Title/i), {
      target: { value: 'Renting a Bicycle' },
    });
    fireEvent.change(screen.getByLabelText(/Target JLPT Level/i), {
      target: { value: 'N4' },
    });
    fireEvent.change(screen.getByLabelText(/Secret Conversation Goal/i), {
      target: { value: 'Rent an electric bicycle for 3 days and ask about lock procedures.' },
    });
    fireEvent.change(screen.getByLabelText(/Your Role/i), {
      target: { value: 'Tourist' },
    });
    fireEvent.change(screen.getByLabelText(/AI Partner Role/i), {
      target: { value: 'Rental Shop Clerk' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save & Select Mission/i }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Renting a Bicycle',
        jlptLevel: 'N4',
        goalDescription: 'Rent an electric bicycle for 3 days and ask about lock procedures.',
        userRole: 'Tourist',
        aiRole: 'Rental Shop Clerk',
        isCustom: true,
      })
    );
  });
});
