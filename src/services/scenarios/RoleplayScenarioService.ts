import { StorageRepository } from '../storage/StorageRepository';
import { RoleplayScenario, JLPTLevel } from '../../types';
import { CURATED_SCENARIOS } from '../../data/scenarios/curatedScenarios';

export class RoleplayScenarioService {
  constructor(private repository: StorageRepository) {}

  async getAllScenarios(): Promise<RoleplayScenario[]> {
    const custom = await this.repository.getCustomScenarios();
    return [...CURATED_SCENARIOS, ...custom];
  }

  async getScenariosByCategory(category?: string): Promise<RoleplayScenario[]> {
    const all = await this.getAllScenarios();
    if (!category || category === 'all') {
      return all;
    }
    return all.filter((s) => s.category === category);
  }

  async getScenariosByLevel(level?: JLPTLevel): Promise<RoleplayScenario[]> {
    const all = await this.getAllScenarios();
    if (!level) return all;
    return all.filter((s) => !s.jlptLevel || s.jlptLevel === level);
  }

  async createCustomScenario(
    titleOrScenario: string | RoleplayScenario,
    category?: 'dining' | 'travel' | 'daily_life' | 'business' | 'emergency',
    goalDescription?: string,
    userRole?: string,
    aiRole?: string
  ): Promise<RoleplayScenario> {
    if (typeof titleOrScenario === 'object') {
      const newScenario = {
        ...titleOrScenario,
        isCustom: true,
      };
      await this.repository.saveCustomScenario(newScenario);
      return newScenario;
    }

    const newScenario: RoleplayScenario = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: titleOrScenario.trim(),
      category: category || 'daily_life',
      goalDescription: (goalDescription || '').trim(),
      userRole: (userRole || '').trim(),
      aiRole: (aiRole || '').trim(),
      isCustom: true,
    };

    await this.repository.saveCustomScenario(newScenario);
    return newScenario;
  }
}
