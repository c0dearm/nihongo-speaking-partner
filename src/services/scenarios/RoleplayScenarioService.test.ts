import { describe, it, expect, beforeEach } from 'vitest';
import { RoleplayScenarioService } from './RoleplayScenarioService';
import { StorageRepository } from '../storage/StorageRepository';

describe('RoleplayScenarioService', () => {
  let repository: StorageRepository;
  let service: RoleplayScenarioService;

  beforeEach(() => {
    repository = new StorageRepository('test_scenarios_db_' + Math.random());
    service = new RoleplayScenarioService(repository);
  });

  it('returns all scenarios or filters by category cleanly without requiring jlptLevel', async () => {
    const all = await service.getAllScenarios();
    expect(all.length).toBeGreaterThanOrEqual(5);

    const dining = await service.getScenariosByCategory('dining');
    expect(dining.length).toBeGreaterThanOrEqual(2);
    expect(dining.every(s => s.category === 'dining')).toBe(true);
  });

  it('saves and retrieves level-agnostic custom scenarios', async () => {
    const created = await service.createCustomScenario(
      'Buying a train ticket to Kyoto',
      'travel',
      'Purchase a Shinkansen reserved seat ticket to Kyoto departing at 10am.',
      'Traveler at ticket counter',
      'JR Station Clerk'
    );

    expect(created.title).toBe('Buying a train ticket to Kyoto');
    expect(created.jlptLevel).toBeUndefined();
    expect(created.isCustom).toBe(true);

    const all = await service.getAllScenarios();
    expect(all.some(s => s.id === created.id)).toBe(true);
  });
});
