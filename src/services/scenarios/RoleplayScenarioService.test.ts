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

  it('returns all 10 curated scenarios spanning all 5 categories and checks specific IDs', async () => {
    const all = await service.getAllScenarios();
    expect(all.length).toBeGreaterThanOrEqual(10);

    const categories = new Set(all.map(s => s.category));
    expect(categories.has('daily_life')).toBe(true);
    expect(categories.has('emergency')).toBe(true);
    expect(categories.has('travel')).toBe(true);
    expect(categories.has('dining')).toBe(true);
    expect(categories.has('business')).toBe(true);

    const ids = new Set(all.map(s => s.id));
    expect(ids.has('konbini_checkout')).toBe(true);
    expect(ids.has('doctor_visit')).toBe(true);
    expect(ids.has('hotel_checkin')).toBe(true);
    expect(ids.has('izakaya_reserve')).toBe(true);
    expect(ids.has('friend_chitchat')).toBe(true);
    expect(ids.has('host_family_breakfast')).toBe(true);
    expect(ids.has('sensei_homework')).toBe(true);
    expect(ids.has('business_meeting')).toBe(true);
    expect(ids.has('lost_property')).toBe(true);
    expect(ids.has('train_directions')).toBe(true);
  });

  it('saves and retrieves level-agnostic custom scenarios alongside curated ones', async () => {
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
