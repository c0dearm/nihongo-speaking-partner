import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { DrillService } from './DrillService';
import { StorageRepository } from '../storage/StorageRepository';

describe('DrillService', () => {
  let storage: StorageRepository;
  let service: DrillService;

  beforeEach(async () => {
    storage = new StorageRepository('test_drills_db_' + Math.random());
    await storage.init();
    service = new DrillService(storage);
  });

  it('retrieves all curated drills when no custom drills exist', async () => {
    const allDrills = await service.getAllDrills();
    expect(allDrills.length).toBe(15); // 3 for each N5-N1 level
  });

  it('retrieves curated drills filtered by level', async () => {
    const n5Drills = await service.getDrillsByLevel('N5');
    expect(n5Drills.length).toBeGreaterThanOrEqual(3);
    expect(n5Drills.every((d) => d.jlptLevel === 'N5')).toBe(true);
  });

  it('retrieves a drill by its id', async () => {
    const drill = await service.getDrillById('n5-scenario-1');
    expect(drill).toBeDefined();
    expect(drill?.title).toBe('Self-Introduction (自己紹介)');

    const nonExistent = await service.getDrillById('non-existent-id');
    expect(nonExistent).toBeUndefined();
  });

  it('creates and merges custom drills with curated drills', async () => {
    await service.createCustomDrill({
      id: 'custom-1',
      jlptLevel: 'N3',
      category: 'scenario',
      title: 'Custom N3 Drill',
      promptText: 'Use 〜ばかりでなく in a sentence.',
      targetGrammar: '〜ばかりでなく',
      isCustom: true,
    });

    const allN3 = await service.getDrillsByLevel('N3');
    const custom = allN3.find((d) => d.id === 'custom-1');
    expect(custom).toBeDefined();
    expect(custom?.title).toBe('Custom N3 Drill');

    const allDrills = await service.getAllDrills();
    expect(allDrills.length).toBe(16);
  });
});
