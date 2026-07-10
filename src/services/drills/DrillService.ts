import { CURATED_DRILLS } from '../../data/drills/curatedDrills';
import { DrillPrompt, JLPTLevel } from '../../types';
import { StorageRepository } from '../storage/StorageRepository';

export class DrillService {
  constructor(private storage: StorageRepository) {}

  async getAllDrills(): Promise<DrillPrompt[]> {
    const customDrills = await this.storage.getCustomDrills();
    return [...CURATED_DRILLS, ...customDrills];
  }

  async getDrillsByLevel(level: JLPTLevel): Promise<DrillPrompt[]> {
    const all = await this.getAllDrills();
    return all.filter((drill) => drill.jlptLevel === level);
  }

  async getDrillById(id: string): Promise<DrillPrompt | undefined> {
    const all = await this.getAllDrills();
    return all.find((d) => d.id === id);
  }

  async createCustomDrill(prompt: DrillPrompt): Promise<DrillPrompt> {
    const customPrompt: DrillPrompt = {
      ...prompt,
      isCustom: true,
    };
    await this.storage.saveCustomDrill(customPrompt);
    return customPrompt;
  }
}
