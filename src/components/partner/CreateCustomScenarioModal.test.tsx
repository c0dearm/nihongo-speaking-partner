import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateCustomScenarioModal } from './CreateCustomScenarioModal';
import { RoleplayScenarioService } from '../../services/scenarios/RoleplayScenarioService';
import { StorageRepository } from '../../services/storage/StorageRepository';

describe('CreateCustomScenarioModal', () => {
  it('submits level-agnostic custom mission form and calls onScenarioCreated', async () => {
    const repo = new StorageRepository('test_modal_db_' + Math.random());
    const scenarioService = new RoleplayScenarioService(repo);
    const mockCreated = vi.fn();
    const mockClose = vi.fn();

    render(
      <CreateCustomScenarioModal
        isOpen={true}
        onClose={mockClose}
        scenarioService={scenarioService}
        onScenarioCreated={mockCreated}
      />
    );

    fireEvent.change(screen.getByLabelText(/Mission Title \*/i), { target: { value: 'Test Custom Mission' } });
    fireEvent.change(screen.getByLabelText(/Your Role \(Student\) \*/i), { target: { value: 'Test User Role' } });
    fireEvent.change(screen.getByLabelText(/AI Partner Role \*/i), { target: { value: 'Test AI Role' } });
    fireEvent.change(screen.getByLabelText(/Secret Goal \/ Mission Objective \*/i), { target: { value: 'Achieve test goal across multiple turns' } });

    fireEvent.click(screen.getByText(/Create Mission/i));

    await waitFor(() => {
      expect(mockCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Custom Mission',
          isCustom: true,
        })
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
