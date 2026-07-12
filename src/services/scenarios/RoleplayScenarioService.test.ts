import { describe, it, expect, beforeEach } from 'vitest';
import { RoleplayScenarioService } from './RoleplayScenarioService';
import { StorageRepository } from '../storage/StorageRepository';
import { RoleplayScenario } from '../../types';

describe('RoleplayScenarioService', () => {
  let repository: StorageRepository;
  let service: RoleplayScenarioService;

  beforeEach(async () => {
    repository = new StorageRepository('test_scenarios_db_' + Date.now());
    await repository.initialize();
    service = new RoleplayScenarioService(repository);
  });

  it('returns curated scenarios filtered by JLPT level', async () => {
    const n4Scenarios = await service.getScenariosByLevel('N4');
    expect(n4Scenarios.length).toBeGreaterThan(0);
    expect(n4Scenarios.every((s) => s.jlptLevel === 'N4')).toBe(true);
    expect(n4Scenarios.some((s) => s.title.includes('Izakaya'))).toBe(true);
  });

  it('combines curated scenarios with saved custom scenarios for that level', async () => {
    const customScenario: RoleplayScenario = {
      id: 'custom-scenario-101',
      title: 'Buying Shinkansen Tickets',
      jlptLevel: 'N3',
      category: 'travel',
      goalDescription: 'Buy two reserved window seat tickets from Tokyo to Kyoto for tomorrow morning.',
      userRole: 'Traveler',
      aiRole: 'Station Ticket Counter Clerk',
      isCustom: true,
    };

    await service.createCustomScenario(customScenario);

    const n3Scenarios = await service.getScenariosByLevel('N3');
    expect(n3Scenarios.some((s) => s.id === 'custom-scenario-101')).toBe(true);
  });
});
